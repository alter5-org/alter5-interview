-- min_score_to_invite is now read by the CV routing code (lib/positions.js
-- routeCvScore): it is the minimum CV score that reaches the admin review
-- queue; below it the application is auto-rejected. Nobody is auto-invited
-- from a score. Historically the code hardcoded 4 while the HoE row said 7 —
-- align the row and the default so behaviour does not change on deploy.
alter table positions alter column min_score_to_invite set default 4;
update positions set min_score_to_invite = 4
 where slug = 'hoe' and min_score_to_invite = 7;
