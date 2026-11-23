alter table company_profile add column if not exists welcome_image_url text;
insert into storage.buckets (id, name, public) values ('public-assets','public-assets', true) on conflict (id) do nothing;
