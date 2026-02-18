import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './search.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
