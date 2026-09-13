export type AdminNavigatorStatus =
  | "pending"
  | "active"
  | "suspended"
  | "disabled";

export type AdminNavigator = {
  user_id: string;

  email: string;

  status: AdminNavigatorStatus;

  first_name: string;

  last_name: string;

  job_title: string;

  department: string | null;

  phone: string | null;

  created_at: string;

  last_login_at: string | null;
};

export type NavigatorCreateRequest = {
  email: string;

  first_name: string;

  last_name: string;

  job_title: string;

  department?: string | null;

  phone?: string | null;
};

export type NavigatorCreateResponse = {
  user_id: string;

  email: string;

  status: AdminNavigatorStatus;

  message: string;
};