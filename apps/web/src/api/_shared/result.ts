export type ServiceResult<T, Code extends string> =
  { ok: true; data: T } | { ok: false; code: Code; message: string };

const UNAVAILABLE_MESSAGE = "Something went wrong. Please try again.";

// The ok/failure/run helpers every service shares. A repository error carrying a known code
// becomes that failure; anything else is logged (so it shows in the Worker logs) and reported as
// UNAVAILABLE without leaking the cause.
export function serviceResults<Code extends string>(options: {
  messageFor: (code: Code) => string;
  codeOf: (cause: unknown) => Code | null;
  invalidInputCode: Code;
  unavailableCode: Code;
}) {
  const ok = <T>(data: T): ServiceResult<T, Code> => ({ ok: true, data });

  const failure = (code: Code, message?: string): ServiceResult<never, Code> => ({
    ok: false,
    code,
    message: message ?? options.messageFor(code),
  });

  const invalidInput = (message: string) => failure(options.invalidInputCode, message);

  const fromError = (cause: unknown): ServiceResult<never, Code> => {
    const code = options.codeOf(cause);
    if (code) return failure(code);
    console.error(cause);
    return failure(options.unavailableCode, UNAVAILABLE_MESSAGE);
  };

  const run = async <T>(action: () => Promise<T>): Promise<ServiceResult<T, Code>> => {
    try {
      return ok(await action());
    } catch (cause) {
      return fromError(cause);
    }
  };

  return { ok, failure, invalidInput, fromError, run };
}
