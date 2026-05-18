export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailService {
  send(payload: EmailPayload): Promise<void>;
}

export class ConsoleEmailService implements EmailService {
  async send(payload: EmailPayload): Promise<void> {
    console.log('[mock-email]', JSON.stringify(payload, null, 2));
  }
}
