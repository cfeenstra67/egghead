import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.js";

export interface SearchHelpProps {
  open: boolean;
  onOpenChanged?: (open: boolean) => void;
}

export default function SearchHelp({ open, onOpenChanged }: SearchHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChanged}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search Help</DialogTitle>
          <DialogDescription>
            Here are some tips to help you get the most out of Egghead's
            powerful search capabilities!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Logical operators & Parentheses</h3>
            <p className="text-sm text-muted-foreground">
              You can use parentheses as well as <code>AND</code>,{" "}
              <code>OR</code>, and <code>NOT</code> to combine search terms. If
              you enter multiple search terms without logical operators,{" "}
              <code>AND</code> will be used to combine them.
            </p>
            <div className="border rounded p-4 font-mono text-sm">
              NOT (stackoverflow OR github) css
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Query specific fields</h3>
            <p className="text-sm text-muted-foreground">
              You can refine your searches by including terms for specific
              fields, like so:
            </p>
            <div className="border rounded p-4 font-mono text-sm">
              startedAt:gt:2025-01-01 NOT url:github kubernetes
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">
              Searches must be at least 3 characters
            </h3>
            <p className="text-sm text-muted-foreground">
              Each search term you use must be at least 3 characters--otherwise
              it will not match any results
            </p>
            <div className="border rounded p-4 font-mono text-sm">
              <pre>
                <span className="text-muted-foreground">
                  # Will not match anything!
                </span>
                {"\n"}
                AP{"\n"}
                <span className="text-muted-foreground">
                  # Also will not match anything!
                </span>
                {"\n"}
                AP AND "something else"
              </pre>
            </div>
          </section>
          <p className="pt-4">
            <a
              href="https://docs.egghead.camfeenstra.com/query-syntax.html"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Check out the docs
            </a>{" "}
            for a more in-depth explanation of the search syntax, including all
            of the fields and operators that can be used for searching.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
