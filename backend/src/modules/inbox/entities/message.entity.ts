export type MessageDirection = 'inbound' | 'outbound';
export type SenderType = 'patient' | 'manager' | 'automation' | 'system';

export interface MessageEntity {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  senderType: SenderType;
  providerMessageId: string;
  text: string;
  payloadJson?: Record<string, unknown>;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
}
