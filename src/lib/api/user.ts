import { api } from '../api';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export const userApi = {
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return api.post<ChangePasswordResponse>('/user/change-password', data);
  },
};
