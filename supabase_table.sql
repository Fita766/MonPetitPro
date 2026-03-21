-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.observations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  operation_id uuid NOT NULL,
  info_date date NOT NULL,
  description text NOT NULL,
  responsible_person text NOT NULL,
  deadline_date date NOT NULL,
  completion_date date,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT observations_pkey PRIMARY KEY (id),
  CONSTRAINT observations_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id),
  CONSTRAINT observations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.operations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  project_manager text NOT NULL,
  operation_type text NOT NULL,
  promoter_name text,
  contractual_delivery_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  daact_date date,
  initial_budget numeric,
  final_budget numeric,
  total_housing_units integer DEFAULT 0,
  lli_units integer DEFAULT 0,
  lls_units integer DEFAULT 0,
  plai_units integer DEFAULT 0,
  pls_units integer DEFAULT 0,
  brs_units integer DEFAULT 0,
  psla_units integer DEFAULT 0,
  individual_housing_units integer DEFAULT 0,
  collective_housing_units integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT operations_pkey PRIMARY KEY (id),
  CONSTRAINT operations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);