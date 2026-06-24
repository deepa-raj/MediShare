import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MedicineCard from '../MedicineCard.jsx';

const baseMedicine = {
  id: 1,
  name: 'Paracetamol 500mg',
  category: 'Pain Relief',
  quantity: 4,
  unit: 'strips',
  city: 'Chennai',
  description: 'Unopened, extra stock.',
  status: 'available',
  days_left: 45,
  urgency: 'fresh',
  donor_name: 'Anita Raman',
};

describe('MedicineCard', () => {
  it('renders the medicine name, category, and quantity', () => {
    render(<MedicineCard medicine={baseMedicine} />);
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('Pain Relief')).toBeInTheDocument();
    expect(screen.getByText('4 strips')).toBeInTheDocument();
  });

  it('shows the donor name when provided', () => {
    render(<MedicineCard medicine={baseMedicine} />);
    expect(screen.getByText('Donated by Anita Raman')).toBeInTheDocument();
  });

  it('renders the status badge with correct label', () => {
    render(<MedicineCard medicine={{ ...baseMedicine, status: 'claimed' }} />);
    expect(screen.getByText('Claimed')).toBeInTheDocument();
  });

  it('renders an action slot when provided', () => {
    render(<MedicineCard medicine={baseMedicine} action={<button>Claim for pickup</button>} />);
    expect(screen.getByRole('button', { name: 'Claim for pickup' })).toBeInTheDocument();
  });
});
