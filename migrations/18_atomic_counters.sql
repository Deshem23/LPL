-- ============================================
-- ATOMIC VIEW/CLICK COUNTERS
-- ============================================
-- incrementViewCount() (article-service.ts), trackAdView() and
-- trackAdClick() (ad-service.ts) all did a SELECT to read the current
-- count, then an UPDATE setting count = (read value + 1). Two concurrent
-- requests hitting the same article/ad both read the same starting
-- value before either writes back, so one increment is silently lost -
-- classic read-then-write race, and this is a page-view counter, so it's
-- hit constantly under real traffic.
--
-- Each function below does the increment as a single atomic UPDATE
-- (`count = count + 1` evaluated server-side by Postgres), which can't
-- lose a concurrent increment the way the read-then-write pattern could.
-- SECURITY DEFINER so it runs with the privileges of the function owner
-- regardless of caller, matching how these were already called through
-- the service-role client - RLS on articles/ads doesn't need to grant
-- UPDATE to a broader audience just for this.
-- ============================================

CREATE OR REPLACE FUNCTION increment_article_view_count(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_view_count(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads
  SET view_count = view_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_click_count(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads
  SET click_count = click_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force PostgREST to pick up the new RPC functions immediately, instead
-- of waiting for its next automatic schema cache refresh.
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFY
-- ============================================
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('increment_article_view_count', 'increment_ad_view_count', 'increment_ad_click_count');
