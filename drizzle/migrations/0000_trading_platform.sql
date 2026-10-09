CREATE TABLE public.stocks (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  sector text,
  market_cap numeric,
  currency text NOT NULL DEFAULT 'USD',
  price numeric,
  price_usd numeric,
  change_pct numeric,
  mom_1m numeric,
  mom_3m numeric,
  rsi14 numeric,
  volatility numeric,
  sma20 numeric,
  sma50 numeric,
  score integer,
  signal text,
  spark jsonb,
  updated_at timestamptz
);
CREATE INDEX stocks_score_idx ON public.stocks (score DESC NULLS LAST);
CREATE INDEX stocks_updated_idx ON public.stocks (updated_at NULLS FIRST);
GRANT SELECT ON public.stocks TO anon, authenticated;
GRANT ALL ON public.stocks TO service_role;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stocks public read" ON public.stocks FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  signal text,
  score integer,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_reports_created_idx ON public.ai_reports (created_at DESC);
GRANT SELECT ON public.ai_reports TO anon, authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports public read" ON public.ai_reports FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.job_runs (
  job text PRIMARY KEY,
  last_run timestamptz NOT NULL DEFAULT now(),
  info text
);
GRANT SELECT ON public.job_runs TO anon, authenticated;
GRANT ALL ON public.job_runs TO service_role;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs public read" ON public.job_runs FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.paper_accounts (
  user_id uuid PRIMARY KEY,
  cash numeric NOT NULL DEFAULT 100000,
  starting_cash numeric NOT NULL DEFAULT 100000,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.paper_accounts TO authenticated;
GRANT ALL ON public.paper_accounts TO service_role;
ALTER TABLE public.paper_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own account" ON public.paper_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.paper_positions (
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  qty numeric NOT NULL,
  avg_cost numeric NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);
GRANT SELECT ON public.paper_positions TO authenticated;
GRANT ALL ON public.paper_positions TO service_role;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own positions" ON public.paper_positions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  qty numeric NOT NULL,
  price numeric NOT NULL,
  realized_pnl numeric,
  source text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX paper_trades_user_idx ON public.paper_trades (user_id, created_at DESC);
GRANT SELECT ON public.paper_trades TO authenticated;
GRANT ALL ON public.paper_trades TO service_role;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades" ON public.paper_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.bot_settings (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  emergency_stop boolean NOT NULL DEFAULT false,
  regions text[] NOT NULL DEFAULT ARRAY['US','EU'],
  blocked_symbols text[] NOT NULL DEFAULT '{}',
  min_score integer NOT NULL DEFAULT 75,
  max_positions integer NOT NULL DEFAULT 10,
  max_trade_usd numeric NOT NULL DEFAULT 10000,
  max_exposure_pct numeric NOT NULL DEFAULT 80,
  daily_loss_limit_pct numeric NOT NULL DEFAULT 3,
  max_drawdown_pct numeric NOT NULL DEFAULT 15,
  stop_loss_pct numeric NOT NULL DEFAULT 8,
  take_profit_pct numeric NOT NULL DEFAULT 20,
  market_hours_only boolean NOT NULL DEFAULT true,
  paused_reason text,
  peak_equity numeric,
  day_start_equity numeric,
  day_start_date date,
  last_run timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bot_settings TO authenticated;
GRANT ALL ON public.bot_settings TO service_role;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bot" ON public.bot_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.bot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bot_events_user_idx ON public.bot_events (user_id, created_at DESC);
GRANT SELECT ON public.bot_events TO authenticated;
GRANT ALL ON public.bot_events TO service_role;
ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.bot_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.execute_paper_trade(_user uuid, _symbol text, _side text, _qty numeric, _price numeric, _source text, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE acc record; pos record; cost numeric; pnl numeric := null;
BEGIN
  IF _qty <= 0 OR _price <= 0 THEN RAISE EXCEPTION 'Invalid quantity or price'; END IF;
  INSERT INTO paper_accounts(user_id) VALUES (_user) ON CONFLICT DO NOTHING;
  SELECT * INTO acc FROM paper_accounts WHERE user_id = _user FOR UPDATE;
  SELECT * INTO pos FROM paper_positions WHERE user_id = _user AND symbol = _symbol FOR UPDATE;
  cost := _qty * _price;
  IF _side = 'buy' THEN
    IF acc.cash < cost THEN RAISE EXCEPTION 'Not enough cash'; END IF;
    UPDATE paper_accounts SET cash = cash - cost WHERE user_id = _user;
    IF pos IS NULL THEN
      INSERT INTO paper_positions(user_id, symbol, qty, avg_cost) VALUES (_user, _symbol, _qty, _price);
    ELSE
      UPDATE paper_positions SET avg_cost = (qty*avg_cost + cost)/(qty+_qty), qty = qty + _qty WHERE user_id=_user AND symbol=_symbol;
    END IF;
  ELSIF _side = 'sell' THEN
    IF pos IS NULL OR pos.qty < _qty - 0.000001 THEN RAISE EXCEPTION 'Not enough shares'; END IF;
    pnl := (_price - pos.avg_cost) * _qty;
    UPDATE paper_accounts SET cash = cash + cost WHERE user_id = _user;
    IF pos.qty - _qty <= 0.000001 THEN
      DELETE FROM paper_positions WHERE user_id=_user AND symbol=_symbol;
    ELSE
      UPDATE paper_positions SET qty = qty - _qty WHERE user_id=_user AND symbol=_symbol;
    END IF;
  ELSE RAISE EXCEPTION 'Invalid side'; END IF;
  INSERT INTO paper_trades(user_id, symbol, side, qty, price, realized_pnl, source, reason)
  VALUES (_user, _symbol, _side, _qty, _price, pnl, _source, _reason);
  RETURN jsonb_build_object('ok', true, 'realized_pnl', pnl);
END $$;
REVOKE ALL ON FUNCTION public.execute_paper_trade(uuid,text,text,numeric,numeric,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_paper_trade(uuid,text,text,numeric,numeric,text,text) TO service_role;