import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";

function loadDeleteMemberAccount() {
  const source = readFileSync(new URL("../lib/delete-member.ts", import.meta.url), "utf8")
    .replace(
      'import { ONBOARDING_STORAGE_BUCKET } from "@/lib/onboarding";',
      'const ONBOARDING_STORAGE_BUCKET = "member-documents";',
    );

  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const module = { exports: {} };
  const context = vm.createContext({
    exports: module.exports,
    module,
  });

  vm.runInContext(outputText, context);

  return module.exports.deleteMemberAccount;
}

function createAdminMock({
  member,
  memberError = null,
  rpcError = null,
  storageError = null,
}) {
  const calls = [];
  const admin = {
    from(tableName) {
      calls.push(["from", tableName]);

      return {
        select(columns) {
          calls.push(["select", columns]);

          return {
            eq(column, value) {
              calls.push(["eq", column, value]);

              return {
                async maybeSingle() {
                  calls.push(["maybeSingle"]);
                  return { data: member, error: memberError };
                },
              };
            },
          };
        },
      };
    },
    async rpc(functionName, args) {
      calls.push(["rpc", functionName, args]);
      return { error: rpcError };
    },
    storage: {
      from(bucketName) {
        calls.push(["storage.from", bucketName]);

        return {
          async remove(paths) {
            calls.push(["storage.remove", paths]);
            return { error: storageError };
          },
        };
      },
    },
  };

  return { admin, calls };
}

const memberWithDocuments = {
  id: "member-1",
  email: "dancer@iu.edu",
  government_id_path: "member-1/government-id.pdf",
  birthday_image_path: null,
  student_id_path: "member-1/student-id.png",
  covid_vaccination_path: null,
};

test("deleteMemberAccount leaves storage documents intact when database delete is blocked", async () => {
  const deleteMemberAccount = loadDeleteMemberAccount();
  const { admin, calls } = createAdminMock({
    member: memberWithDocuments,
    rpcError: { message: "update or delete on table members violates foreign key constraint" },
  });

  const result = await deleteMemberAccount(admin, memberWithDocuments.id);

  assert.equal(result.error, "update or delete on table members violates foreign key constraint");
  assert.equal(calls.some(([name]) => name === "storage.from"), false);
  assert.equal(calls.some(([name]) => name === "storage.remove"), false);
});

test("deleteMemberAccount removes preloaded documents after a successful database delete", async () => {
  const deleteMemberAccount = loadDeleteMemberAccount();
  const { admin, calls } = createAdminMock({ member: memberWithDocuments });

  const result = await deleteMemberAccount(admin, memberWithDocuments.id);
  const removeCall = calls.find(([name]) => name === "storage.remove");

  assert.equal(result.error, null);
  assert.equal(removeCall?.[0], "storage.remove");
  assert.deepEqual(Array.from(removeCall?.[1] ?? []), [
    "member-1/government-id.pdf",
    "member-1/student-id.png",
  ]);
  assert.ok(
    calls.findIndex(([name]) => name === "rpc") <
      calls.findIndex(([name]) => name === "storage.remove"),
  );
});
