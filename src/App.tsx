import { Route, Switch } from 'wouter';
import { GamePage } from './pages/GamePage';
import { GameTwoPage } from './pages/GameTwoPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';

// Здесь живут только маршруты. Сами экраны складывай в src/pages/.
export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/game" component={GamePage} />
      <Route path="/game-2" component={GameTwoPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
