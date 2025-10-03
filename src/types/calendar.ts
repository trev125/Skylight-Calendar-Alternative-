export interface Event {
  id: string;
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  creator?: {
    email?: string;
  };
  _calendarId?: string;
  _accountToken?: string;
}

export interface SelectedCalendar {
  id: string;
  calendarId: string;
  accountToken: string;
  summary?: string;
  accountEmail?: string;
}
