import { EventSection, exhibitionsSection, theatreSection } from '../utils/eventSections';
import AddEventScreen from './AddEventScreen';
import EventsSearchScreen from './EventsSearchScreen';
import EventsTimelineScreen from './EventsTimelineScreen';

// Вкладки раздела-событий: те же три экрана, привязанные к своему разделу
function makeEventScreens(section: EventSection) {
  return {
    Timeline: () => <EventsTimelineScreen section={section} />,
    Add: () => <AddEventScreen section={section} />,
    Search: () => <EventsSearchScreen section={section} />,
  };
}

export const theatreScreens = makeEventScreens(theatreSection);
export const exhibitionsScreens = makeEventScreens(exhibitionsSection);
