import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpiryBar from '../ExpiryBar.jsx';

describe('ExpiryBar', () => {
  it('shows "Good time left" for fresh urgency', () => {
    render(<ExpiryBar daysLeft={90} urgency="fresh" />);
    expect(screen.getByText('Good time left')).toBeInTheDocument();
    expect(screen.getByText('90 days left')).toBeInTheDocument();
  });

  it('shows "Expiring soon" for soon urgency', () => {
    render(<ExpiryBar daysLeft={20} urgency="soon" />);
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
  });

  it('shows "Expires very soon" for critical urgency', () => {
    render(<ExpiryBar daysLeft={3} urgency="critical" />);
    expect(screen.getByText('Expires very soon')).toBeInTheDocument();
    expect(screen.getByText('3 days left')).toBeInTheDocument();
  });

  it('shows "Expired" with days-ago phrasing for expired urgency', () => {
    render(<ExpiryBar daysLeft={-5} urgency="expired" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('Expired 5 days ago')).toBeInTheDocument();
  });

  it('uses singular "day" phrasing when exactly one day remains', () => {
    render(<ExpiryBar daysLeft={1} urgency="critical" />);
    expect(screen.getByText('1 day left')).toBeInTheDocument();
  });
});
