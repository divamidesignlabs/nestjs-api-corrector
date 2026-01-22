import { Injectable } from '@nestjs/common';

@Injectable()
export class DynamicMasterService {
  greeting(): string {
    return 'Hello from Dynamic Master Library!';
  }
}
