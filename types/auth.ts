export type UserAddress = {
  id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  fullName?: string;
  phone?: string;
  upiId?: string;
  avatarUrl?: string;
  addresses?: UserAddress[];
};

export type UpdateProfileData = {
  displayName?: string;
  fullName?: string;
  phone?: string;
  upiId?: string;
  addresses?: UserAddress[];
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = LoginCredentials & {
  displayName: string;
  confirmPassword: string;
};

export type ChangePasswordData = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ForgotPasswordData = {
  email: string;
};
