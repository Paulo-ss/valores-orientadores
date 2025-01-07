import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import puppeteer from 'puppeteer';
import { CommonService } from 'src/tasks/common/common.service';
import { VI } from 'src/vi/types/vi.type';
import * as xlsx from 'xlsx';
import { IVIFile } from './interfaces/vi-file.interface';
import { IVIContent } from './interfaces/vi-content.interface';

@Injectable()
export class ViService {
  constructor(private readonly commonService: CommonService) {}

  private getCurrentCasViJSONFile() {
    try {
      const currentCasViJSONFile = this.commonService.readFile<IVIFile>(
        `${process.cwd()}/files/json/cas-vi-numbers.json`,
      );

      return currentCasViJSONFile;
    } catch (error) {
      return null;
    }
  }

  public async generateCasViJSONFile() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto(
        'https://www.epa.gov/risk/regional-screening-levels-rsls-generic-tables',
      );

      const lastUpdated = await page.$eval(
        '.l-page__footer-last-updated',
        (element) => {
          return element.innerHTML;
        },
      );

      const currentCasViJSONFile = this.getCurrentCasViJSONFile();
      if (
        currentCasViJSONFile &&
        lastUpdated === currentCasViJSONFile.lastUpdated
      ) {
        return;
      }

      await page.waitForSelector('a#summary-table-xls-1[href]', {
        timeout: 60000,
      });

      const linkToSummaryTable = await page.$$eval(
        'a#summary-table-xls-1',
        (anchors) => {
          return anchors.map((anchor) => anchor.href);
        },
      );

      const response = await fetch(linkToSummaryTable[0]);

      if (response.ok) {
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        let casViNumbers: VI = {} as VI;

        for (const key in rawJsonData) {
          const data = rawJsonData[key] as any;

          const cetesbFile = this.commonService.readFile<VI>(
            `${process.cwd()}/files/json/cetesb/cas-cetesb.json`,
          );

          const foundCetesbCas = cetesbFile[data.__EMPTY_13];

          casViNumbers = {
            ...casViNumbers,
            [data.__EMPTY_13]: {
              residentSoil: data.__EMPTY_14,
              industrialSoil: data.__EMPTY_16,
              tapWater: data.__EMPTY_22,
              VRQ: foundCetesbCas?.VRQ,
              VP: foundCetesbCas?.VP,
              agricola: foundCetesbCas?.agricola,
              residencial: foundCetesbCas?.residencial,
              industrial: foundCetesbCas?.industrial,
              VI: foundCetesbCas?.VI,
            },
          };
        }

        const fileContent: IVIFile = {
          lastUpdated,
          vi: casViNumbers,
        };

        this.commonService.emptyDir(`${process.cwd()}/files/json/cas-vi`);

        this.commonService.writeFile(
          `${process.cwd()}/files/json/cas-vi/cas-vi-numbers.json`,
          fileContent,
        );
      }
    } catch (error) {
      console.log('SCRAPE ERROR: ', { error });

      throw new InternalServerErrorException(error);
    } finally {
      await browser.close();
    }
  }

  public async findViNumberByCas(cas: string): Promise<VI | null> {
    const casViNumbers = this.commonService.readFile<IVIFile>(
      `${process.cwd()}/files/json/cas-vi/cas-vi-numbers.json`,
    );

    let foundCas: IVIContent | null = null;

    for (const key in casViNumbers.vi) {
      if (key === cas) {
        foundCas = casViNumbers.vi[key];
        break;
      }
    }

    if (foundCas === null) {
      throw new BadRequestException(
        `Valores Orientadores não encontrados para o CAS ${cas}`,
      );
    }

    return { [cas]: foundCas };
  }

  public async findAllAvailableCas() {
    const casViNumbers = this.commonService.readFile<IVIFile>(
      `${process.cwd()}/files/json/cas-vi/cas-vi-numbers.json`,
    );

    const availableCas: string[] = [];

    for (const key in casViNumbers.vi) {
      if (key && key !== 'CAS No.') {
        availableCas.push(key);
      }
    }

    return availableCas;
  }
}
