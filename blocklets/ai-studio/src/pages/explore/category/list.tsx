import 'swiper/css';
import 'swiper/css/navigation';

import { Icon } from '@iconify-icon/react';
import CircleArrowLeft from '@iconify-icons/tabler/circle-arrow-left';
import CircleArrowRight from '@iconify-icons/tabler/circle-arrow-right';
import { Box, Card, CardContent, Grid, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

const tools = [
  {
    id: 'add-airtable-record',
    title: 'Add Airtable record',
    description: 'Empower your agent to add records to Airtable. This tool adds a record to the given Airtable tabl...',
  },
  {
    id: 'google-search',
    title: 'Google Search',
    description: 'Give your agent the power to query Google.',
  },
  {
    id: 'google-sheets-integration',
    title: 'Google sheets integration (Apps Script)',
    description:
      'Run Apps Script in Google Sheets. To use this tool you need to "Make your own" to get access to th...',
  },
  {
    id: 'phone-number-verifier',
    title: 'Phone number verifier (add API key)',
    description: 'This tool checks for fraudulent phone numbers. It hits https://www.ipqualityscore.com API and...',
  },
  {
    id: 'run-long-prompt-via-zeplo',
    title: 'Run a long prompt via Zeplo',
    description: "This tool helps when you want to trigger a Wordware prompt asynchronously. It's a...",
  },
  {
    id: 'send-to-slack',
    title: 'Send to Slack',
    description: "This tool enables sending a message to Slack. Uses ' Slack-flavoured markdown ' for the...",
  },
  {
    id: 'webscrape-with-beautiful-soup',
    title: 'Webscrape with Beautiful Soup',
    description: 'This tool is a super simple example of how to scrape web pages with BeautifulSoup. It extracts...',
  },
  {
    id: 'whisper-replicate',
    title: 'Whisper Replicate',
    description: "This tool transcribes the audio using OpenAI's Whisper model hosted on Replicate....",
  },
  {
    id: 'wikipedia-search',
    title: 'Wikipedia search',
    description: 'This tool enables querying Wikipedia.',
  },
  {
    id: 'you-com-search',
    title: 'You.com search (add API key)',
    description: 'This tool uses You.com search API to get results from around the web.',
  },
  {
    id: 'google-businesses-integration',
    title: 'Google businesses integration',
    description: 'Searches for businesses that match specific keywords in a certain location.',
  },
  {
    id: 'google-news-integration',
    title: 'Google news integration',
    description: 'Fetches Google News on certain topic.',
  },
  {
    id: 'google-reviews-integration',
    title: 'Google reviews integration',
    description: 'Scrapes reviews of a certain business.',
  },
  {
    id: 'search-reddit-posts',
    title: 'Search Reddit Posts',
    description: 'Search Reddit for posts. Can be used in combination with other flows to build more...',
  },
  {
    id: 'alpha-vantage-integration',
    title: 'Alpha Vantage integration',
    description: 'Check daily performance of stocks.',
  },
];

function CategoryCard({ title, description }: { title: string; description: string }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <Box width={1} pb="40%" position="relative">
        <Box
          position="absolute"
          sx={{
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="h2">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

function CategoryList() {
  const navigate = useNavigate();

  return (
    <Box sx={{ flexGrow: 1, p: 2.5 }}>
      <Box
        sx={{
          mb: 2.5,
          height: 300,
          borderRadius: 1,
          position: 'relative',
          border: '1px solid red',
          boxSizing: 'border-box',

          '.swiper': {
            height: 1,
          },
        }}>
        <Box
          loop
          component={Swiper}
          modules={[Navigation]}
          navigation={{
            nextEl: '.swiper-button-next-custom',
            prevEl: '.swiper-button-prev-custom',
          }}
          slidesPerView={1}>
          <SwiperSlide>
            <Box width={1} height={1}>
              Slide 1
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box width={1} height={1}>
              Slide 2
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box width={1} height={1}>
              Slide 3
            </Box>
          </SwiperSlide>
          <SwiperSlide>
            <Box width={1} height={1}>
              Slide 4
            </Box>
          </SwiperSlide>
        </Box>

        <IconButton
          className="swiper-button-prev-custom"
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}>
          <Box component={Icon} icon={CircleArrowLeft} sx={{ fontSize: 30 }} />
        </IconButton>
        <IconButton
          className="swiper-button-next-custom"
          sx={{
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}>
          <Box component={Icon} icon={CircleArrowRight} sx={{ fontSize: 30 }} />
        </IconButton>
      </Box>

      <Grid container spacing={2.5}>
        {tools.map((tool) => (
          <Grid item key={tool.title} xs={12} sm={6} md={4} onClick={() => navigate(tool.id)}>
            <CategoryCard title={tool.title} description={tool.description} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default CategoryList;
