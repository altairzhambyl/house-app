// Mock data for the views that are not part of the MVP yet.
// Every view using it shows the "Демо-данные" badge.

export const OUTAGES = [
  { id: 1, type: 'Water', start: '29 Sep 2026 09:00', end: '29 Sep 2026 14:00', floors: 'All floors', reason: 'Scheduled pipe inspection and pressure testing', status: 'Active' },
  { id: 2, type: 'Electricity', start: '5 Oct 2026 10:00', end: '5 Oct 2026 13:00', floors: 'Floors 1–5', reason: 'Switchboard upgrade in basement', status: 'Upcoming' },
  { id: 3, type: 'Heating', start: '1 Oct 2026 00:00', end: '3 Oct 2026 00:00', floors: 'All floors', reason: 'Start-of-season heating system flush', status: 'Upcoming' },
  { id: 4, type: 'Elevator', start: '22 Sep 2026 08:00', end: '22 Sep 2026 17:00', floors: 'Stairwell B', reason: 'Annual safety certification inspection', status: 'Done' },
]

export const COMPLAINTS = [
  { id: 1, from: 'Flat 12A', about: 'Flat 13A', subject: 'Noise after 23:00', status: 'Under review', date: '26 Sep 2026' },
  { id: 2, from: 'Flat 8C', about: 'Flat 8B', subject: 'Cigarette smoke in shared hallway', status: 'Resolved', date: '19 Sep 2026' },
  { id: 3, from: 'Flat 3B', about: 'Common area', subject: 'Dog not on leash in elevator', status: 'Closed', date: '12 Sep 2026' },
]

export type VoteChoice = 'yes' | 'no' | 'abstain'

export interface Vote {
  id: number
  title: string
  deadline: string
  status: string
  yes: number
  no: number
  abstain: number
  total: number
  voted: boolean
  myVote?: VoteChoice
}

export const VOTES: Vote[] = [
  {
    id: 1,
    title: 'Install CCTV cameras in all stairwells',
    deadline: '10 Oct 2026',
    status: 'Open',
    yes: 42,
    no: 11,
    abstain: 5,
    total: 80,
    voted: false,
  },
  {
    id: 2,
    title: 'Increase communal cleaning frequency to 3× per week',
    deadline: '15 Oct 2026',
    status: 'Open',
    yes: 31,
    no: 22,
    abstain: 8,
    total: 80,
    voted: true,
    myVote: 'yes',
  },
  {
    id: 3,
    title: 'Repaint building facade — approve 2026 budget item',
    deadline: '20 Sep 2026',
    status: 'Closed',
    yes: 55,
    no: 18,
    abstain: 7,
    total: 80,
    voted: true,
    myVote: 'yes',
  },
]

export const PAYMENTS = [
  { id: 1, month: 'September 2026', amount: 18500, status: 'Paid', date: '5 Sep 2026', breakdown: { communal: 8000, repair: 4500, security: 2000, cleaning: 4000 } },
  { id: 2, month: 'August 2026', amount: 18500, status: 'Paid', date: '4 Aug 2026', breakdown: { communal: 8000, repair: 4500, security: 2000, cleaning: 4000 } },
  { id: 3, month: 'July 2026', amount: 16000, status: 'Paid', date: '6 Jul 2026', breakdown: { communal: 8000, repair: 2500, security: 2000, cleaning: 3500 } },
  { id: 4, month: 'October 2026', amount: 19000, status: 'Due', date: 'Due 10 Oct 2026', breakdown: { communal: 8000, repair: 5000, security: 2000, cleaning: 4000 } },
]

export const RENTED_FLATS = [
  { flat: '14B', tenant: 'Asel Nurmagambetova', since: 'Jan 2026', paid: true, nextDue: 'Oct 2026', requests: 2 },
  { flat: '22A', tenant: 'Dauren Bektenov', since: 'Mar 2025', paid: false, nextDue: 'Sep 2026', requests: 0 },
]
