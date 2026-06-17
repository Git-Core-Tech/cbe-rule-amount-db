/* eslint-disable @typescript-eslint/no-unused-vars */
import { type DataCache, type RuleConfig, type RuleRequest, type RuleResult } from '@tazama-lf/frms-coe-lib/lib/interfaces';
import {
  DatabaseManagerMock,
  determineOutcome,
  LoggerServiceMock,
  MockDatabaseManagerFactory,
  MockLoggerServiceFactory,
} from '@tazama-lf/frms-coe-lib/lib/tests/mocks';
import { handleTransaction, RuleExecutorConfig } from '../../src/rule';

const getRuleConfig = (): RuleConfig => {
  return {
    id: 'cbe-rule-amount-db@1.0.0',
    cfg: '1.0.0',
    desc: 'VERSION DB: test amount transaction',
    config: {
      bands: [
        {
          reason: 'amount is small',
          subRuleRef: '.01',
          upperLimit: 4999,
        },
        {
          reason: 'amount is big',
          lowerLimit: 5000,
          subRuleRef: '.02',
        },
      ],
      parameters: {
        tolerance: 0.1,
        maxQueryRange: 86400000,
      },
      exitConditions: [],
    },
    tenantId: 'DEFAULT',
  };
};

const getMockRequest = (): RuleRequest => {
  const quote = {
    transaction: JSON.parse(
      `{"TxTp":"amounttransaction","MsgId":"TXN-20260610-0001","Payload":{"msgId":"TXN-20260610-0001","amount":25000,"sender":{"bankName":"Meezan Bank","fullName":"Ali Khan","personId":"P-1001","phoneNumber":"+923001234567","accountNumber":"PK001234567890"},"status":"PENDING","channel":"MOBILE_APP","purpose":"Personal transfer","currency":"PKR","metadata":{"deviceId":"device-abc-123","location":"Karachi, Pakistan","ipAddress":"192.168.1.10"},"receiver":{"bankName":"HBL","fullName":"Ahmed Raza","personId":"P-2001","phoneNumber":"+923211234567","accountNumber":"PK009876543210"},"transactionType":"TRANSFER","transactionDateTime":"2026-06-10T14:30:00+05:00"},"TenantId":"cbe"}`,
    ),
    networkMap: JSON.parse(
      '{"cfg":"1.0.0","name":"Public 701 Network Map","active":true,"messages":[{"id":"123@1.0.0","cfg":"1.0.0","txTp":"test_transaction","typologies":[{"id":"test-processor@1.0.0","cfg":"test@1.0.0","rules":[{"id":"cbe-rule-test@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"123@1.0.0","cfg":"1.0.0","txTp":"fable004","typologies":[{"id":"story-processor@1.0.0","cfg":"fables@1.0.0","rules":[{"id":"cbe-rule-fable004@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"135@1.0.0","cfg":"1.0.0","txTp":"amount","typologies":[{"id":"new-test-rule-processor@1.0.0","cfg":"new-test-rule@1.0.0","rules":[{"id":"cbe-rule-new@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"999@1.0.0","cfg":"1.0.0","txTp":"kashif123","typologies":[{"id":"kashif-processor@1.0.0","cfg":"kashif@1.0.0","rules":[{"id":"cbe-rule-kashif@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"456@1.0.0","cfg":"1.0.0","txTp":"amount_processor_transaction","typologies":[{"id":"test-processor@1.0.0","cfg":"test@1.0.0","rules":[{"id":"cbe-rule-test@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"987@1.0.0","cfg":"1.0.0","txTp":"country","typologies":[{"id":"cases-processor@1.0.0","cfg":"cases@1.0.0","rules":[{"id":"cbe-cases-rule@1.0.0","cfg":"1.0.0"},{"id":"cbe-rule-cnic@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"004@1.0.0","cfg":"1.0.0","txTp":"dems_pacs002","typologies":[{"id":"typology-processor@1.0.0","cfg":"999@1.0.0","rules":[{"id":"EFRuP@1.0.0","cfg":"none"},{"id":"901@1.0.0","cfg":"1.0.0"},{"id":"902@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]},{"id":"619@1.0.0","cfg":"1.0.0","txTp":"amounttransaction","typologies":[{"id":"amount-typology-processor@1.0.0","cfg":"atp@1.0.0","rules":[{"id":"cbe-rule-amount@1.0.0","cfg":"1.0.0"},{"id":"cbe-rule-amount-db@1.0.0","cfg":"1.0.0"}],"tenantId":"cbe"}]}],"tenantId":"cbe"}',
    ),
    DataCache: JSON.parse(
      '{"cdtrId":"TXN-20260610-0001","dbtrId":"TXN-20260610-0001","cdtrAcctId":"TXN-20260610-0001","dbtrAcctId":"TXN-20260610-0001"}',
    ),
  };
  return quote;
};

const getMockRequestUnsuccessful = (): RuleRequest => {
  const quote = getMockRequest();
  quote.transaction.FIToFIPmtSts.TxInfAndSts.TxSts = 'RJCT';
  return quote;
};

const ruleResult: RuleResult = {
  id: '021@1.0.0',
  cfg: '1.0.0',
  tenantId: 'DEFAULT',
  subRuleRef: '.err',
  reason: 'Unhandled rule result outcome',
};


const dataCache: DataCache = {
  dbtrId: 'dbtr_516c7065d75b4fcea6fffb52a9539357',
  cdtrId: 'cdtr_b086a1e193794192b32c8af8550d721d',
  dbtrAcctId: 'dbtrAcct_1fd08e408c184dd28cbaeef03bff1af5',
  cdtrAcctId: 'cdtrAcct_d531e1ba4ed84a248fe26617e79fcb64',
};

let databaseManager: DatabaseManagerMock<RuleExecutorConfig>;

let loggerService: LoggerServiceMock;
describe('Rule 021 Test', () => {
beforeEach(() => {
        loggerService = MockLoggerServiceFactory();
        loggerService.resetMock();
        databaseManager = MockDatabaseManagerFactory<RuleExecutorConfig>();
        databaseManager.resetMock();
  });
  describe('handleTransaction', () => {
    describe('Exit Conditions', () => {
let dataCache: DataCache;
        let req: RuleRequest;
beforeEach(() => {
        dataCache = {
            dbtrId: 'dbtr_516c7065d75b4fcea6fffb52a9539357',
            cdtrId: 'cdtr_b086a1e193794192b32c8af8550d721d',
            dbtrAcctId: 'dbtrAcct_1fd08e408c184dd28cbaeef03bff1af5',
            cdtrAcctId: 'cdtrAcct_d531e1ba4ed84a248fe26617e79fcb64',
        };
        req = getMockRequest();
      });
test('No RuleConfig - bands', async () => {
        const dbData = [1];
        databaseManager._eventHistory.query.mockResolvedValue({
          rows: [
            ...dbData.map((x) => ({
              Amt: x,
            })),
          ],
        });
        const rConfig = getRuleConfig();
        rConfig.config.bands = undefined;
        try {
          await handleTransaction(req, determineOutcome, ruleResult, loggerService, rConfig, databaseManager);
        } catch (error) {
          expect((error as Error).message).toBe('Invalid config provided - bands not provided');
        }
      });
test('No exit conditions', async () => {
        const dbData = [1, 2, 3];
        databaseManager._eventHistory.query.mockResolvedValue({
          rows: [
            ...dbData.map((x) => ({
              Amt: x,
            })),
          ],
        });
        try {
          const rConfig = getRuleConfig();
          rConfig.config.exitConditions = undefined;
          await handleTransaction(req, determineOutcome, ruleResult, loggerService, rConfig, databaseManager);
        } catch (error) {
          expect((error as Error).message).toBe('Invalid config provided - exitConditions not provided');
        }
      });
test('No tolerance', async () => {
        // Mocking the request of getting oldes transation timestamp
        const dbData = [1, 2, 3];
        databaseManager._eventHistory.query.mockResolvedValue({
          rows: [
            ...dbData.map((x) => ({
              Amt: x,
            })),
          ],
        });
        try {
          const rConfig = getRuleConfig();
          rConfig.config.parameters!.tolerance = undefined;
          await handleTransaction(req, determineOutcome, ruleResult, loggerService, rConfig, databaseManager);
        } catch (error) {
          expect((error as Error).message).toBe('Invalid config provided - tolerance parameter not provided or invalid type');
        }
      });
test('No tolerance - not number', async () => {
        const dbData = [1, 2, 3];
        databaseManager._eventHistory.query.mockResolvedValue({
          rows: [
            ...dbData.map((x) => ({
              Amt: x,
            })),
          ],
        });
        try {
          const rConfig = getRuleConfig();
          rConfig.config.parameters!.tolerance = 'zero point two';
          await handleTransaction(req, determineOutcome, ruleResult, loggerService, rConfig, databaseManager);
        } catch (error) {
          expect((error as Error).message).toBe('Invalid config provided - tolerance parameter not provided or invalid type');
        }
      });
    });
  });
});