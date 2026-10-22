ALTER TABLE "FiscalInvoiceTemplate" ADD CONSTRAINT "FiscalInvoiceTemplate_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "FiscalClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
