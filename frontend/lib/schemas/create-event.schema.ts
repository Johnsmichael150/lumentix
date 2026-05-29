import { z } from 'zod';

const sponsorTierSchema = z.object({
  name: z.string().min(1, 'Tier name is required'),
  benefits: z.string().optional(),
  price: z.number({ invalid_type_error: 'Price must be a number' }).positive('Price must be greater than 0'),
  maxSponsors: z.number({ invalid_type_error: 'Must be a number' }).int().positive().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  ticketPrice: z.number({ invalid_type_error: 'Ticket price must be a number' }).min(0, 'Price must be non-negative'),
  currency: z.string().min(1, 'Currency is required'),
  status: z.enum(['draft', 'published', 'completed', 'cancelled']),
  sponsorTiers: z.array(sponsorTierSchema).optional(),
  authToken: z.string().optional(),
  walletPublicKey: z.string().optional(),
});

export type CreateEventFormInput = z.input<typeof createEventSchema>;
export type CreateEventFormValues = z.output<typeof createEventSchema>;

export const defaultCreateEventValues: CreateEventFormInput = {
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  ticketPrice: 0,
  currency: 'XLM',
  status: 'draft',
  sponsorTiers: [],
  authToken: '',
  walletPublicKey: '',
};
