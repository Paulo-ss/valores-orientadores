import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import puppeteer from 'puppeteer';
import { VI } from 'src/vi/types/vi.type';
import * as xlsx from 'xlsx';
import { IVIFile } from './interfaces/vi-file.interface';
import { IVIContent } from './interfaces/vi-content.interface';
import { list, put } from '@vercel/blob';

@Injectable()
export class ViService {
  private async getCurrentCasViJSONFile() {
    try {
      const { blobs } = await list();

      const casVIBlob = blobs.find((blob) =>
        blob.downloadUrl.includes('cas-vi-numbers'),
      );

      if (!casVIBlob) {
        return null;
      }

      const response = await fetch(casVIBlob.downloadUrl);
      if (response.ok) {
        const casViNumbers = await response.json();

        return casViNumbers as IVIFile;
      }
    } catch (error) {
      console.log('CURRENT CAS VI FILE ERROR: ', { error });

      return null;
    }
  }

  private async getCurrentCetesbJSONFile(): Promise<VI | null> {
    try {
      const { blobs } = await list();

      const casCetesbBlob = blobs.find((blob) =>
        blob.downloadUrl.includes('cas-cetesb'),
      );
      if (!casCetesbBlob) {
        return null;
      }

      const response = await fetch(casCetesbBlob.downloadUrl);
      if (response.ok) {
        const casViNumbers = await response.json();

        return casViNumbers as VI;
      }
    } catch (error) {
      console.log('CURRENT CAS CETESB FILE ERROR: ', { error });

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

      const currentCasViJSONFile = await this.getCurrentCasViJSONFile();
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

          const cetesbFile = await this.getCurrentCetesbJSONFile();

          const foundCetesbCas = cetesbFile
            ? cetesbFile[data.__EMPTY_13]
            : undefined;

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

        await put('cas-cetesb.json', JSON.stringify(fileContent), {
          access: 'public',
        });
      }
    } catch (error) {
      console.log('SCRAPE ERROR: ', { error });

      throw new InternalServerErrorException(error);
    } finally {
      await browser.close();
    }
  }

  public async findViNumberByCas(cas: string): Promise<VI | null> {
    const casViNumbers = await this.getCurrentCasViJSONFile();

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
    const casViNumbers = await this.getCurrentCasViJSONFile();

    const availableCas: string[] = [];

    for (const key in casViNumbers.vi) {
      if (key && key !== 'CAS No.') {
        availableCas.push(key);
      }
    }

    return availableCas;
  }

  public async getLastUpdated() {
    const casViNumbers = await this.getCurrentCasViJSONFile();

    const date = casViNumbers.lastUpdated.replace('Last updated on ', '');
    const formattedDate = new Date(date).toLocaleDateString('pt', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });

    return { lastUpdated: formattedDate };
  }
}
