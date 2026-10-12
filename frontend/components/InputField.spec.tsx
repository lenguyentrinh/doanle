import React from 'react';
import { render, screen } from '@testing-library/react';
import InputField from './InputField';

describe('InputField', () => {
  it('renders without label or error', () => {
    render(<InputField placeholder="Enter value" />);
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<InputField label="Full Name" />);
    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<InputField error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('does not render error when omitted', () => {
    render(<InputField label="Email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes through input attributes', () => {
    render(<InputField type="email" placeholder="you@example.com" />);
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('forwards ref to the input element', () => { 
    const ref = React.createRef<HTMLInputElement>();
    render(<InputField ref={ref} placeholder="ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
