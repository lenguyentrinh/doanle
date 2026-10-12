/* eslint-disable react/display-name -- inline mock components */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_HOME_HERO } from '@/features/home/types/homeHero';

const getAdmin = jest.fn();
const update = jest.fn();
const revalidate = jest.fn();
jest.mock('@/features/admin/services/adminAPI', () => ({
  getAdminHomeHeroAPI: (...a: unknown[]) => getAdmin(...a),
  updateAdminHomeHeroAPI: (...a: unknown[]) => update(...a),
  uploadAdminHomeHeroImageAPI: jest.fn(),
}));
jest.mock('@/app/admin/home/actions', () => ({
  revalidateHomePage: () => revalidate(),
}));
jest.mock('@/features/home/components/hero/HeroRenderer', () => () => null);
jest.mock('@/features/admin/components/AdminPageHeader', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('@/lib/toast', () => ({ showToast: { success: jest.fn(), error: jest.fn() } }));

import HomeHeroManager from '@/features/admin/components/HomeHeroManager';

describe('HomeHeroManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    update.mockImplementation(async (h) => h);
    revalidate.mockResolvedValue(undefined);
  });

  it('saves the default hero on first run (no config) and revalidates the home page', async () => {
    getAdmin.mockResolvedValue(null);
    render(<HomeHeroManager />);
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toMatchObject({
      template: DEFAULT_HOME_HERO.template,
      images: DEFAULT_HOME_HERO.images,
    });
    await waitFor(() => expect(revalidate).toHaveBeenCalledTimes(1));
  });

  it('does not revalidate when the save fails', async () => {
    getAdmin.mockResolvedValue(null);
    update.mockRejectedValue(new Error('boom'));
    render(<HomeHeroManager />);
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(revalidate).not.toHaveBeenCalled();
  });
});
