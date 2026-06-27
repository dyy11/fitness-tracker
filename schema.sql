-- ============================================================
-- 健身记录工具 - Supabase 数据库建表脚本
-- 使用方法：在 Supabase SQL Editor 中执行
-- ============================================================

-- --------------------------------
-- 1. plans（健身计划表）
-- 用于存储用户创建的健身计划，如"增肌计划"、"减脂计划"等
-- --------------------------------
create table plans (
  id          text    primary key,            -- 主键，唯一标识一个计划
  name        text    not null,               -- 计划名称，必填
  note        text    default '',             -- 计划备注/描述，选填
  created_at  bigint  not null,               -- 创建时间（时间戳，毫秒）
  updated_at  bigint  not null                -- 最后更新时间（时间戳，毫秒）
);

-- --------------------------------
-- 2. exercises（训练项目表）
-- 每个计划下可包含多个训练项目，如"杠铃卧推"、"深蹲"、"引体向上"
-- 当 plan 被删除时，其下的所有 exercise 自动级联删除
-- --------------------------------
create table exercises (
  id          text    primary key,            -- 主键，唯一标识一个训练项目
  plan_id     text    not null references plans(id) on delete cascade,  -- 所属计划 ID
  name        text    not null,               -- 项目名称，如"杠铃卧推"
  unit        text    not null default 'kg',  -- 单位：kg / 次 / 分钟 / km / 个
  sort_order  int     not null default 0      -- 在计划内的排序序号，越小越靠前
);

-- 按 plan_id 快速查找某计划下的所有项目
create index idx_exercises_plan on exercises(plan_id);

-- --------------------------------
-- 3. sessions（训练记录表）
-- 每次训练产生一条记录，包含训练日期和整体备注
-- 一个计划可以有多条 session，一条 session 属于一个计划
-- 当 plan 被删除时，其下的所有 session 自动级联删除
-- --------------------------------
create table sessions (
  id          text    primary key,            -- 主键，唯一标识一次训练记录
  plan_id     text    not null references plans(id) on delete cascade,  -- 所属计划 ID
  date        bigint  not null,               -- 训练日期（时间戳，毫秒）
  note        text    default '',             -- 本次训练的整体备注，如"今天状态不错"
  created_at  bigint  not null                -- 记录创建时间（时间戳，毫秒）
);

-- 按 plan_id 快速查找某计划的所有训练记录
create index idx_sessions_plan on sessions(plan_id);

-- --------------------------------
-- 4. records（每组训练数据表）
-- 一次训练中，每个项目可能做多组，每组一条记录
-- 包含该组的序号、重量、次数
-- 当 session 被删除时，其下的所有 record 自动级联删除
-- --------------------------------
create table records (
  id            text    primary key,          -- 主键，唯一标识一组数据
  session_id    text    not null references sessions(id) on delete cascade,  -- 所属训练记录 ID
  exercise_id   text    not null references exercises(id) on delete cascade, -- 所属训练项目 ID
  set_number    int     not null,             -- 组序号，如第 1 组、第 2 组
  weight        numeric not null default 0,   -- 重量/强度值
  reps          int     not null default 0,   -- 次数/时长
  note          text    default ''            -- 该组备注，选填
);

-- 按 session_id 快速查找某次训练的所有组数据
create index idx_records_session on records(session_id);
-- 按 exercise_id 快速查找某个项目的所有历史组数据（用于图表统计）
create index idx_records_exercise on records(exercise_id);

-- --------------------------------
-- 5. Row Level Security（行级安全策略）
-- Supabase 要求对公开表设置 RLS，否则默认全部拒绝
-- 这里设置为允许所有操作（因为通过 anon key + 应用层鉴权）
-- 实际生产环境应改为基于用户认证的策略
-- --------------------------------
alter table plans     enable row level security;
alter table exercises enable row level security;
alter table sessions  enable row level security;
alter table records   enable row level security;

-- 允许所有操作（个人使用，暂不设登录）
create policy "允许所有操作" on plans     for all using (true) with check (true);
create policy "允许所有操作" on exercises for all using (true) with check (true);
create policy "允许所有操作" on sessions  for all using (true) with check (true);
create policy "允许所有操作" on records   for all using (true) with check (true);
