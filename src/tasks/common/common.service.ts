import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CommonService {
  public emptyDir(dir: string) {
    fs.readdir(dir, (err, files) => {
      try {
        if (err) {
          throw err;
        }

        for (const file of files) {
          fs.unlink(path.join(dir, file), (err) => {
            if (err) {
              throw err;
            }
          });
        }
      } catch (error) {
        throw new InternalServerErrorException(error);
      }
    });
  }

  public writeFile(filename: string, content: any) {
    try {
      fs.writeFileSync(filename, JSON.stringify(content));
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  public readFile<T>(filepath: string) {
    try {
      const fileRaw = fs.readFileSync(filepath, { encoding: 'utf8' });

      return JSON.parse(fileRaw) as T;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
