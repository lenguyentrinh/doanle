/* eslint-disable react/display-name -- inline mock components */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getAdmin = jest.fn();
const update = jest.fn();
const upload = jest.fn();
const revalidate = jest.fn();
const toast = { success: jest.fn(), error: jest.fn() };
jest.mock('@/features/admin/services/adminAPI', () => ({
  getAdminAuthLookbookAPI: (...a: unknown[]) => getAdmin(...a),
  updateAdminAuthLookbookAPI: (...a: unknown[]) => update(...a),
  uploadAdminAuthLookbookImageAPI: (...a: unknown[]) => upload(...a),
}));
jest.mock('@/app/admin/auth-lookbook/actions', () => ({
  revalidateAuthPages: () => revalidate(),
}));
jest.mock('@/features/admin/components/AdminPageHeader', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('@/lib/toast', () => ({ showToast: { success: (m: string) => toast.success(m), error: (m: string) => toast.error(m) } }));

import AuthLookbookManager from '@/features/admin/components/AuthLookbookManager';

const EMPTY = { imageUrl: null, caption: null, label: null };

describe('AuthLookbookManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    update.mockImplementation(async (p) => ({ ...EMPTY, ...p }));
    revalidate.mockResolvedValue(undefined);
  });

  it('saves caption and label (blank -> null) and revalidates the auth pages', async () => {
    getAdmin.mockResolvedValue(EMPTY);
    render(<AuthLookbookManager />);
    await userEvent.type(await screen.findByPlaceholderText('N° 014'), 'N° 020');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toEqual({ imageUrl: null, caption: null, label: 'N° 020' });
    await waitFor(() => expect(revalidate).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalled();
  });

  it('uploads an image then sends its url on save', async () => {
    getAdmin.mockResolvedValue(EMPTY);
    upload.mockResolvedValue('/uploads/look.jpg');
    render(<AuthLookbookManager />);
    const input = await screen.findByLabelText('Chọn ảnh');
    await userEvent.upload(input, new File(['x'], 'a.png', { type: 'image/png' }));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].imageUrl).toBe('/uploads/look.jpg');
  });

  it('rejects an unsupported file type without uploading', async () => {
    getAdmin.mockResolvedValue(EMPTY);
    render(<AuthLookbookManager />);
    const input = await screen.findByLabelText('Chọn ảnh');
    await userEvent.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(upload).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');
  });

  it('removing the image sends imageUrl: null', async () => {
    getAdmin.mockResolvedValue({ imageUrl: '/uploads/old.jpg', caption: null, label: null });
    render(<AuthLookbookManager />);
    await userEvent.click(await screen.findByRole('button', { name: 'Xoá ảnh' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].imageUrl).toBeNull();
  });

  it('does not revalidate when the save fails', async () => {
    getAdmin.mockResolvedValue(EMPTY);
    update.mockRejectedValue(new Error('boom'));
    render(<AuthLookbookManager />);
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(revalidate).not.toHaveBeenCalled();
  });
});
