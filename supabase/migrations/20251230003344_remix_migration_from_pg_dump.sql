CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: archived_seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archived_seasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season integer NOT NULL,
    contestants jsonb NOT NULL,
    scoring_events jsonb NOT NULL,
    final_standings jsonb NOT NULL,
    archived_at bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contestants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contestants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    name text NOT NULL,
    tribe text,
    age integer,
    location text,
    owner text,
    pick_number integer,
    is_eliminated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crying_contestants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crying_contestants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    episode integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: draft_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    player_name text NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: final_predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    player_name text NOT NULL,
    predicted_winner text NOT NULL,
    episode integer NOT NULL,
    is_revealed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: game_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    season integer DEFAULT 49 NOT NULL,
    episode integer DEFAULT 1 NOT NULL,
    mode text DEFAULT 'setup'::text NOT NULL,
    is_post_merge boolean DEFAULT false NOT NULL,
    draft_type text DEFAULT 'snake'::text NOT NULL,
    current_draft_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    player_name text NOT NULL,
    avatar text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scoring_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    contestant_name text NOT NULL,
    action text NOT NULL,
    points integer NOT NULL,
    episode integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_player_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_player_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    player_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_player_mapping_player_name_check CHECK ((player_name = ANY (ARRAY['Brad'::text, 'Coco'::text, 'Kalin'::text, 'Roy'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: archived_seasons archived_seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archived_seasons
    ADD CONSTRAINT archived_seasons_pkey PRIMARY KEY (id);


--
-- Name: contestants contestants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contestants
    ADD CONSTRAINT contestants_pkey PRIMARY KEY (id);


--
-- Name: crying_contestants crying_contestants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crying_contestants
    ADD CONSTRAINT crying_contestants_pkey PRIMARY KEY (id);


--
-- Name: crying_contestants crying_contestants_session_id_contestant_id_episode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crying_contestants
    ADD CONSTRAINT crying_contestants_session_id_contestant_id_episode_key UNIQUE (session_id, contestant_id, episode);


--
-- Name: draft_order draft_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_order
    ADD CONSTRAINT draft_order_pkey PRIMARY KEY (id);


--
-- Name: final_predictions final_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_predictions
    ADD CONSTRAINT final_predictions_pkey PRIMARY KEY (id);


--
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: player_profiles player_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT player_profiles_pkey PRIMARY KEY (id);


--
-- Name: player_profiles player_profiles_session_id_player_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT player_profiles_session_id_player_name_key UNIQUE (session_id, player_name);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: scoring_events scoring_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_events
    ADD CONSTRAINT scoring_events_pkey PRIMARY KEY (id);


--
-- Name: user_player_mapping user_player_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_player_mapping
    ADD CONSTRAINT user_player_mapping_pkey PRIMARY KEY (id);


--
-- Name: user_player_mapping user_player_mapping_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_player_mapping
    ADD CONSTRAINT user_player_mapping_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_contestants_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contestants_session ON public.contestants USING btree (session_id);


--
-- Name: idx_crying_contestants_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crying_contestants_session ON public.crying_contestants USING btree (session_id);


--
-- Name: idx_draft_order_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_order_session ON public.draft_order USING btree (session_id);


--
-- Name: idx_player_profiles_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_profiles_session ON public.player_profiles USING btree (session_id);


--
-- Name: idx_scoring_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scoring_events_session ON public.scoring_events USING btree (session_id);


--
-- Name: game_sessions update_game_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contestants contestants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contestants
    ADD CONSTRAINT contestants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: crying_contestants crying_contestants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crying_contestants
    ADD CONSTRAINT crying_contestants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: draft_order draft_order_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_order
    ADD CONSTRAINT draft_order_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: user_player_mapping fk_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_player_mapping
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: player_profiles player_profiles_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_profiles
    ADD CONSTRAINT player_profiles_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scoring_events scoring_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_events
    ADD CONSTRAINT scoring_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: game_sessions Admins can create game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create game sessions" ON public.game_sessions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_player_mapping Admins can delete player mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete player mappings" ON public.user_player_mapping FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_player_mapping Admins can insert player mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert player mappings" ON public.user_player_mapping FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: game_sessions Admins can update game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update game sessions" ON public.game_sessions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_player_mapping Admins can update player mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update player mappings" ON public.user_player_mapping FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_player_mapping Admins can view all player mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all player mappings" ON public.user_player_mapping FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: final_predictions Authenticated users can create predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create predictions" ON public.final_predictions FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: final_predictions Authenticated users can delete predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete predictions" ON public.final_predictions FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: archived_seasons Authenticated users can manage archived seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage archived seasons" ON public.archived_seasons USING ((auth.uid() IS NOT NULL));


--
-- Name: contestants Authenticated users can manage contestants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage contestants" ON public.contestants USING ((auth.uid() IS NOT NULL));


--
-- Name: crying_contestants Authenticated users can manage crying contestants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage crying contestants" ON public.crying_contestants USING ((auth.uid() IS NOT NULL));


--
-- Name: draft_order Authenticated users can manage draft order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage draft order" ON public.draft_order USING ((auth.uid() IS NOT NULL));


--
-- Name: player_profiles Authenticated users can manage player profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage player profiles" ON public.player_profiles USING ((auth.uid() IS NOT NULL));


--
-- Name: scoring_events Authenticated users can manage scoring events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage scoring events" ON public.scoring_events USING ((auth.uid() IS NOT NULL));


--
-- Name: final_predictions Authenticated users can update predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update predictions" ON public.final_predictions FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: archived_seasons Authenticated users can view archived seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view archived seasons" ON public.archived_seasons FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: contestants Authenticated users can view contestants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view contestants" ON public.contestants FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: crying_contestants Authenticated users can view crying contestants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view crying contestants" ON public.crying_contestants FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: draft_order Authenticated users can view draft order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view draft order" ON public.draft_order FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: game_sessions Authenticated users can view game sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view game sessions" ON public.game_sessions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: player_profiles Authenticated users can view player profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view player profiles" ON public.player_profiles FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: final_predictions Authenticated users can view predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view predictions" ON public.final_predictions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: scoring_events Authenticated users can view scoring events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view scoring events" ON public.scoring_events FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: profiles Profiles cannot be deleted by users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles cannot be deleted by users" ON public.profiles FOR DELETE USING (false);


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: user_player_mapping Users can view their own player mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own player mapping" ON public.user_player_mapping FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: archived_seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.archived_seasons ENABLE ROW LEVEL SECURITY;

--
-- Name: contestants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contestants ENABLE ROW LEVEL SECURITY;

--
-- Name: crying_contestants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crying_contestants ENABLE ROW LEVEL SECURITY;

--
-- Name: draft_order; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.draft_order ENABLE ROW LEVEL SECURITY;

--
-- Name: final_predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.final_predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: game_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: player_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: scoring_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scoring_events ENABLE ROW LEVEL SECURITY;

--
-- Name: user_player_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_player_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;