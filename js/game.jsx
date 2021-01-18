var React = require('react');
var Store = require('./store');
var Sudoku = require('./sudoku');
var Boards = require('./boards');
import { Link } from 'react-router';

class Cell extends React.Component {
  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  shouldComponentUpdate(newProps, newState) {
    var oldCell = this.props.cell;
    var newCell = newProps.cell;
    return (
      oldCell.value !== newCell.value ||
      oldCell.editable !== newCell.editable ||
      oldCell.hasConflict !== newCell.hasConflict
    );
  }

  render() {
    var cell = this.props.cell;

    var classes = [];
    classes.push('i' + cell.i);
    classes.push('j' + cell.j);
    classes.push(cell.editable ? 'editable' : 'not-editable');
    classes.push(cell.hasConflict ? 'has-conflict' : 'no-conflict');

    return (
      <td className={classes.join(' ')}>
        <input
          type="tel"
          value={cell.value}
          onClick={this.onClick}
          onChange={this.onChange} />
      </td>
    );
  }

  onClick(event) {
    event.preventDefault();
    if (this.props.cell.editable) {
      event.target.select();
    } else {
      event.target.blur();
    }
  }

  onChange(event) {
    event.preventDefault();
    var cell = this.props.cell;
    if (!cell.editable) {
      return;
    }
    var newValue = event.target.value;
    if (newValue !== '' && !/^[1-9]$/.test(newValue)) {
      event.target.value = cell.value;
      return;
    }
    Store.dispatch({
      type: 'CHANGE_VALUE',
      i: cell.i,
      j: cell.j,
      value: newValue === '' ? null : parseInt(newValue)
    });
  }
}


class Controls extends React.Component {
  constructor(props) {
    super(props);
    this.state = Store.getState();
  }

  componentDidMount() {
    var self = this;
    self.unsubscribe = Store.subscribe(function () {
      self.setState(Store.getState());
    });
  }

  componentWillUnmount() {
    this.unsubscribe();
  }
  getTime() {
    var time = this.state.game.time;
    function f(num) {
      if (num < 10) {
        return '0' + num;
      } else {
        return '' + num;
      }
    }
    return f(time.getHours()) + ':' + f(time.getMinutes()) + ':' + f(time.getSeconds())
  }
  render() {
    return (
      <div className="controls">
        <p className="back"><Link to="/">Back</Link></p>
        {Sudoku.isComplete(this.state.game.cells)
          ? <p className="congratulations">Trvalo ti to {this.getTime()} ale uz jsi vyhrala gratulace :D</p>
          : <p className="text">{this.getTime()}</p>}
      </div>
    )
  }
}

class DifficultyDialog extends React.Component {
  shouldComponentUpdate(newProps, newState) {
    return false;
  }

  constructor(props) {
    super(props);
    this.state = Store.getState();

    this.difficultyClick = this.difficultyClick.bind(this);
  }

  componentDidMount() {
    var self = this;
    self.unsubscribe = Store.subscribe(function () {
      self.setState(Store.getState());
    });
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return (
      <div className="dialog">
        <p>Please, choose the difficulty:</p>
        <input id="index" type="number" />
        <br />
        <button data-difficulty="easy" onClick={this.difficultyClick}>Easy</button>
        <button data-difficulty="medium" onClick={this.difficultyClick}>Medium</button>
        <button data-difficulty="hard" onClick={this.difficultyClick}>Hard</button>
        <button className="expert" data-difficulty="expert" onClick={this.difficultyClick}>Expert</button>
        <Link to="/" className="dialog-close">&#x2715;</Link>
      </div>
    );
  }

  difficultyClick(event) {
    event.preventDefault();
    var difficulty = event.target.getAttribute('data-difficulty');
    var index = document.getElementById("index").value;
    if (index > 0) {
      index--;
      var check_index_result = Boards.checkIndex(index, difficulty);
      if (check_index_result == -1) {
        Store.dispatch({ type: 'NEW_GAME_INDEX', difficulty, index });
        location.hash = 'play';
      } else {
        alert("Not valid number for this difficulty. max(" + check_index_result + ")");
      }
    } else {
      Store.dispatch({ type: 'NEW_GAME_RANDOM', difficulty });
      location.hash = 'play';
    }
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = Store.getState();
  }

  componentDidMount() {
    var self = this;
    this.unsubscribe = Store.subscribe(function () {
      self.setState(Store.getState());
    });

    this.addSecond = setInterval(function () {
      Store.dispatch({ type: 'ADD_SECOND' });
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.addSecond);
    this.unsubscribe();
  }

  render() {
    if (typeof localStorage.currentGame === 'undefined') {
      location.hash = '/';
      return <div></div>;
    }

    return (
      <div>
        <table className="sudoku-table">
          <tbody>
            {this.state.game.cells.map(function (line, i) {
              return (
                <tr key={i}>
                  {line.map(function (cell) {
                    return <Cell cell={cell} key={cell.j} />;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        <Controls />
      </div>
    );
  }
}

class Index extends React.Component {
  render() {
    return (
      <div className="index">
        <h1>Sudoku</h1>
        <p><Link to="new-game">Start a new game</Link></p>
        {this.hasExistingGame()
          ? <p>or <Link to="play">resume the existing one</Link></p>
          : null}
        {this.createScoreBoard()}

      </div>
    );
  }
  createScoreBoard() {
    var result;
    if (typeof localStorage.history !== 'undefined') {
      var history = JSON.parse(localStorage.history)
      var rows = [];
      if (history.played.length > 0) {
        history.played.sort((x, y) => (result = x.difficulty.localeCompare(y.difficulty)) == 0 ? x.time.localeCompare(y.time) : result).forEach(game => {
          rows.push(<tr>
            <th>{game.difficulty}</th>
            <th>{game.attempt}</th>
            <th>{game.id + 1}</th>
            <th>{game.time}</th>
          </tr>);
        });
      }
    } else {
      return "";
    }
    return (<table className="score-board">
      {rows}
    </table>);
  }
  hasExistingGame() {
    return (typeof localStorage.currentGame !== 'undefined');
  }
}

function App(props) {
  return (
    <div>
      {props.children}
    </div>
  );
}

module.exports = { App, DifficultyDialog, Game, Index };
