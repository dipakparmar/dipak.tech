import type { Thing, WithContext } from 'schema-dts';

type JsonLdProps = {
  data: WithContext<Thing> | Array<WithContext<Thing>>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
