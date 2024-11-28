import { Box } from '@mui/material';

type BasePropType = {
  type: string;
  description?: string;
};

export type ObjectPropType = BasePropType & {
  type: 'object';
  properties: Record<string, PropType>;
  required?: string[];
};

export type ArrayPropType = BasePropType & {
  type: 'array';
  items: PropType;
};

export type PropType = (BasePropType & { type: 'string' | 'number' | 'boolean' }) | ArrayPropType | ObjectPropType;

interface PropertyProps {
  prop: PropType;
  name?: string;
  level?: number;
  parentRequired?: string[];
}

export const Property = ({ name, prop, level = 0, parentRequired }: PropertyProps) => {
  const renderPropertyInfo = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1 }}>
      {name && (
        <Box sx={{ color: '#047857', maxWidth: 72 }} className="ellipsis" title={name}>
          {name}
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ color: '#1D4ED8' }}>{prop.type}</Box>
          {name && parentRequired?.includes(name) && <Box sx={{ color: '#B45309' }}>required</Box>}
        </Box>
        {prop.description && (
          <Box
            sx={{ color: '#030712', WebkitLineClamp: 3, overflowWrap: 'break-word' }}
            className="multi-line-ellipsis"
            title={prop.description}>
            {prop.description}
          </Box>
        )}
      </Box>
    </Box>
  );

  const renderChildren = () => {
    if (prop.type === 'object') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
          {Object.entries(prop.properties).map(([n, p]) => (
            <Property key={n} name={n} prop={p} level={level + 1} parentRequired={prop.required} />
          ))}
        </Box>
      );
    }

    if (prop.type === 'array') {
      return (
        <Box sx={{ mt: 1.5 }}>
          <Property key={name} prop={prop.items} level={level + 1} />
        </Box>
      );
    }

    return null;
  };

  return (
    <Box sx={{ ml: level === 0 ? 0 : 3 }}>
      {renderPropertyInfo()}
      {renderChildren()}
    </Box>
  );
};

const Schema = ({ schema }: { schema: ObjectPropType }) => {
  return (
    <Box
      sx={{
        maxWidth: 600,
        maxHeight: 450,
        overflow: 'auto',
        p: 2,
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}>
      {Object.entries(schema.properties).map(([name, prop]) => (
        <Property key={name} name={name} prop={prop} parentRequired={schema.required} />
      ))}
    </Box>
  );
};

export default Schema;
