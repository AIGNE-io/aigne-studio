import MarkdownRenderer from '../../components/MarkdownRenderer';
import OutputFieldContainer from '../../components/OutputFieldContainer';
import { useCurrentAgent } from '../../contexts/CurrentAgent';
import { useCurrentMessageOutput } from '../../contexts/CurrentMessage';
import { useOpeningMessage } from '../../hooks/use-appearances';

export default function OpeningQuestionsView() {
  const { output } = useCurrentMessageOutput();

  const { aid } = useCurrentAgent();

  const opening = useOpeningMessage({ aid });

  if (!opening?.message) return null;

  return (
    <OutputFieldContainer output={output}>
      <MarkdownRenderer>{opening?.message}</MarkdownRenderer>
    </OutputFieldContainer>
  );
}
