import { Injectable, InternalServerErrorException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { VI } from 'src/vi/types/vi.type';
import * as xlsx from 'xlsx';
import { IVIFile } from './interfaces/vi-file.interface';
import { list, put, del } from '@vercel/blob';

@Injectable()
export class ViService {
  private getAndFormatDateFromLastUpdatedString(dateString: string): string {
    if (!dateString) {
      return null;
    }

    const date = dateString.replace('Last updated on ', '');
    const formattedDate = new Date(date).toLocaleDateString('pt', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });

    return formattedDate;
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

  public async getCurrentCasViJSONFile(): Promise<IVIFile | null> {
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
        const casViNumbers = (await response.json()) as IVIFile;

        const formattedDate = this.getAndFormatDateFromLastUpdatedString(
          casViNumbers.lastUpdated,
        );

        return { ...casViNumbers, lastUpdated: formattedDate };
      }
    } catch (error) {
      console.log('CURRENT CAS VI FILE ERROR: ', { error });

      return null;
    }
  }

  public async generateCasViJSONFile() {
    const browser = await puppeteer.launch({ headless: true });
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
      const lastUpdatedFormattedDate =
        this.getAndFormatDateFromLastUpdatedString(lastUpdated);

      const currentCasViJSONFile = await this.getCurrentCasViJSONFile();
      if (
        currentCasViJSONFile &&
        lastUpdatedFormattedDate === currentCasViJSONFile.lastUpdated
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

        const cetesbFile = await this.getCurrentCetesbJSONFile();

        for (const key in rawJsonData) {
          const data = rawJsonData[key] as any;

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

        for (const key in cetesbFile) {
          const cas = casViNumbers[key];

          if (!cas) {
            const foundCetesbCas = cetesbFile[key];

            casViNumbers = {
              ...casViNumbers,
              [key]: {
                residentSoil: undefined,
                industrialSoil: undefined,
                tapWater: undefined,
                VRQ: foundCetesbCas?.VRQ,
                VP: foundCetesbCas?.VP,
                agricola: foundCetesbCas?.agricola,
                residencial: foundCetesbCas?.residencial,
                industrial: foundCetesbCas?.industrial,
                VI: foundCetesbCas?.VI,
              },
            };
          }
        }

        const fileContent: IVIFile = {
          lastUpdated,
          vi: casViNumbers,
        };

        const { blobs } = await list();

        blobs.forEach(async (blob) => {
          if (blob.downloadUrl.includes('cas-vi-numbers')) {
            await del(blob.downloadUrl);
          }
        });

        await put('cas-vi-numbers.json', JSON.stringify(fileContent), {
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
}
