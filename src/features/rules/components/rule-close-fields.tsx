import { Field } from "@/components/shared/field";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { type DocRule, NEED_KINDS, NEED_LABEL } from "@/domain/rules/engine";

/**
 * How a step closes (legacy NEED_KINDS, tpl): by a document, a number, a confirmation, the
 * message that goes out with a template, or a milestone of the journey — and the checklist a
 * paper is read against.
 */
export function RuleCloseFields({ r }: { r?: DocRule }) {
  return (
    <>
      <Field
        id="r-checklist"
        label="Checklist"
        hint="The key of a list in Settings › Checklists; the paper is then checked item by item, never by a tick"
      >
        <Input id="r-checklist" name="checklist" defaultValue={r?.checklist} />
      </Field>
      <Field
        id="r-need"
        label="Closes by"
        hint="What closes the step: a document unless said otherwise"
      >
        <NativeSelect
          id="r-need"
          name="need"
          defaultValue={r?.need ?? "file"}
          options={NEED_KINDS.map((k) => ({ value: k, label: NEED_LABEL[k] }))}
        />
      </Field>
      <Field
        id="r-tpl"
        label="Closed by the template"
        hint="For a message step: the template's code (Settings › Templates); the step is done once a message with it goes out from the booking. Empty: a message coded with the rule's own code."
      >
        <Input id="r-tpl" name="tpl" defaultValue={r?.tpl} className="font-mono uppercase" />
      </Field>
      <Field
        id="r-event"
        label="Closed by the milestone"
        hint="For a tracking step: the journey milestone (Settings › Release & tracking) that closes it when ticked"
      >
        <Input id="r-event" name="event" defaultValue={r?.event} />
      </Field>
    </>
  );
}
