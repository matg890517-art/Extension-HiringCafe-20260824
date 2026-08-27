import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  ExpandMore,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import type { JobResult } from './readDrawer';

type FieldKey = keyof JobResult;

const GROUPS: { title: string; fields: { key: FieldKey; label: string }[] }[] = [
  {
    title: 'Company',
    fields: [
      { key: 'company', label: 'Company' },
      { key: 'logo', label: 'Company logo' },
      { key: 'companyLink', label: 'Company link' },
      { key: 'companyTags', label: 'Company tags' },
    ],
  },
  {
    title: 'Job',
    fields: [
      { key: 'title', label: 'Job title' },
      { key: 'description', label: 'Description' },
      { key: 'apply_url', label: 'Apply link' },
      { key: 'postedAgo', label: 'Posted ago' },
      { key: 'tags', label: 'Tags' },
      { key: 'skills', label: 'Skills' },
      { key: 'id', label: 'Job id' },
    ],
  },
  {
    title: 'Details',
    fields: [
      { key: 'location', label: 'Location' },
      { key: 'employmentType', label: 'Employment type' },
      { key: 'workplaceType', label: 'Workplace type' },
      { key: 'salary', label: 'Salary' },
      { key: 'applicantsText', label: 'Applicants' },
    ],
  },
];

function filled(value: unknown) {
  if (value == null) return false;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
}

export function JobFields({ job }: { job: JobResult | null }) {
  return (
    <Box>
      {GROUPS.map((group) => {
        const got = group.fields.filter(({ key }) => filled(job?.[key])).length;
        return (
          <Accordion
            key={group.title}
            disableGutters
            elevation={0}
            square
            sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {group.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {got}/{group.fields.length}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0 }}>
              <List dense>
                {group.fields.map(({ key, label }) => (
                  <FieldRow
                    key={key}
                    label={label}
                    fieldKey={key}
                    value={job?.[key]}
                  />
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

function FieldRow({
  label,
  fieldKey,
  value,
}: {
  label: string;
  fieldKey: FieldKey;
  value: unknown;
}) {
  const exist = filled(value);
  return (
    <ListItem alignItems="flex-start" sx={{ px: 1 }}>
      <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
        {exist ? (
          <CheckCircle color="success" fontSize="small" />
        ) : (
          <RadioButtonUnchecked color="disabled" fontSize="small" />
        )}
      </ListItemIcon>
      <Stack sx={{ minWidth: 0, flex: 1 , overflow: 'hidden'}}>
        <ListItemText primary={label} sx={{ m: 0 }} />
        {exist ? <FieldValue fieldKey={fieldKey} value={value} /> : null}
      </Stack>
    </ListItem>
  );
}
const clamp = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
} as const;

function FieldValue({ fieldKey, value }: { fieldKey: FieldKey; value: unknown }) {
  if (fieldKey === 'logo' && typeof value === 'string') {
    return (
      <Box
        component="img"
        src={value}
        alt=""
        sx={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 1 }}
      />
    );
  }
  if (Array.isArray(value)) {
    return (
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
        {value.map((tag) => (
          <Chip key={tag} label={tag} size="small" />
        ))}
      </Stack>
    );
  }
  const href = fieldKey === 'apply_url' || fieldKey === 'companyLink';
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{  ...clamp,   ...(href ? { WebkitLineClamp: 1 } : null), }}
    >
      {String(value)}
    </Typography>
  );
}