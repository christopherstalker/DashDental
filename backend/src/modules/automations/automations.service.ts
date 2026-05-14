import { Injectable } from '@nestjs/common';

@Injectable()
export class AutomationsService {
  async toggleRule(ruleId: string, actorUserId: string) {
    return { ruleId, actorUserId };
  }

  async enqueueAutoReply(input: { organizationId: string; leadId: string }) {
    return input;
  }
}
