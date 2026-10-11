create table public.forum_posts (
	id uuid primary key default gen_random_uuid(),
	author_id uuid not null references auth.users(id) on delete cascade,
	author_name text not null check (length(btrim(author_name)) between 1 and 254),
	title text not null check (length(btrim(title)) between 1 and 100),
	content text not null check (length(btrim(content)) between 1 and 3000),
	created_at timestamptz not null default now()
);

create table public.forum_replies (
	id uuid primary key default gen_random_uuid(),
	post_id uuid not null references public.forum_posts(id) on delete cascade,
	author_id uuid not null references auth.users(id) on delete cascade,
	author_name text not null check (length(btrim(author_name)) between 1 and 254),
	content text not null check (length(btrim(content)) between 1 and 3000),
	created_at timestamptz not null default now()
);

create index forum_posts_created_at_idx on public.forum_posts(created_at desc);
create index forum_replies_post_created_at_idx on public.forum_replies(post_id, created_at);

alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;

grant select on public.forum_posts, public.forum_replies to anon, authenticated;
grant insert on public.forum_posts, public.forum_replies to authenticated;

create policy "Anyone can read forum posts"
	on public.forum_posts for select
	to anon, authenticated
	using (true);

create policy "Authenticated users can create forum posts"
	on public.forum_posts for insert
	to authenticated
	with check (author_id = (select auth.uid()));

create policy "Anyone can read forum replies"
	on public.forum_replies for select
	to anon, authenticated
	using (true);

create policy "Authenticated users can create forum replies"
	on public.forum_replies for insert
	to authenticated
	with check (author_id = (select auth.uid()));
