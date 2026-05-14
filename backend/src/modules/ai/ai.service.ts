import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async enqueueConversationSummary(input: {
    organizationId: string;
    conversationId: string;
    actorUserId: string;
  }) {
    return input;
  }
}
