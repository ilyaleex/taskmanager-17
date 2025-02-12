import {render, RenderPosition, remove} from '../framework/render.js';
import BoardView from '../view/board-view.js';
import SortView from '../view/sort-view.js';
import TaskListView from '../view/task-list-view.js';
import LoadMoreButtonView from '../view/load-more-button-view.js';
import NoTaskView from '../view/no-task-view.js';
import TaskPresenter from './task-presenter.js';
import {updateItem} from '../utils/common.js';
import {sortTaskUp, sortTaskDown} from '../utils/task.js';
import {SortType} from '../const.js';

const TASK_COUNT_PER_STEP = 8;

export default class BoardPresenter {
  #boardContainer = null;
  #tasksModel = null;

  #boardComponent = new BoardView();
  #taskListComponent = new TaskListView();
  #sortComponent = new SortView();
  #noTaskComponent = new NoTaskView();
  #loadMoreButtonComponent = new LoadMoreButtonView();

  #boardTasks = [];
  #renderedTaskCount = TASK_COUNT_PER_STEP;
  #taskPresenter = new Map();
  #currentSortType = SortType.DEFAULT;
  #sourcedBoardTasks = [];

  constructor(boardContainer, tasksModel) {
    this.#boardContainer = boardContainer;
    this.#tasksModel = tasksModel;
  }

  init = () => {
    this.#boardTasks = [...this.#tasksModel.tasks];
    // 1. В отличии от сортировки по любому параметру,
    // исходный порядок можно сохранить только одним способом -
    // сохранив исходный массив:
    this.#sourcedBoardTasks = [...this.#tasksModel.tasks];

    this.#renderBoard();
  };

  #handleLoadMoreButtonClick = () => {
    this.#renderTasks(this.#renderedTaskCount, this.#renderedTaskCount + TASK_COUNT_PER_STEP);
    this.#renderedTaskCount += TASK_COUNT_PER_STEP;

    if (this.#renderedTaskCount >= this.#boardTasks.length) {
      remove(this.#loadMoreButtonComponent);
    }
  };

  #handleModeChange = () => {
    this.#taskPresenter.forEach((presenter) => presenter.resetView());
  };

  #handleTaskChange = (updatedTask) => {
    this.#boardTasks = updateItem(this.#boardTasks, updatedTask);
    this.#sourcedBoardTasks = updateItem(this.#sourcedBoardTasks, updatedTask);
    this.#taskPresenter.get(updatedTask.id).init(updatedTask);
  };

  #sortTasks = (sortType) => {
    // 2. Этот исходный массив задач необходим,
    // потому что для сортировки мы будем мутировать
    // массив в свойстве _boardTasks
    switch (sortType) {
      case SortType.DATE_UP:
        this.#boardTasks.sort(sortTaskUp);
        break;
      case SortType.DATE_DOWN:
        this.#boardTasks.sort(sortTaskDown);
        break;
      default:
        // 3. А когда пользователь захочет "вернуть всё, как было",
        // мы просто запишем в _boardTasks исходный массив
        this.#boardTasks = [...this.#sourcedBoardTasks];
    }

    this.#currentSortType = sortType;
  };

  #handleSortTypeChange = (sortType) => {
    if (this.#currentSortType === sortType) {
      return;
    }

    this.#sortTasks(sortType);
    this.#clearTaskList();
    this.#renderTaskList();
  };

  #renderSort = () => {
    render(this.#sortComponent, this.#boardComponent.element, RenderPosition.AFTERBEGIN);
    this.#sortComponent.setSortTypeChangeHandler(this.#handleSortTypeChange);
  };

  #renderTask = (task) => {
    const taskPresenter = new TaskPresenter(this.#taskListComponent.element, this.#handleTaskChange, this.#handleModeChange);
    taskPresenter.init(task);
    this.#taskPresenter.set(task.id, taskPresenter);
  };

  #renderTasks = (from, to) => {
    this.#boardTasks
      .slice(from, to)
      .forEach((task) => this.#renderTask(task));
  };

  #renderNoTasks = () => {
    render(this.#noTaskComponent, this.#boardComponent.element, RenderPosition.AFTERBEGIN);
  };

  #renderLoadMoreButton = () => {
    render(this.#loadMoreButtonComponent, this.#boardComponent.element);

    this.#loadMoreButtonComponent.setClickHandler(this.#handleLoadMoreButtonClick);
  };

  #clearTaskList = () => {
    this.#taskPresenter.forEach((presenter) => presenter.destroy());
    this.#taskPresenter.clear();
    this.#renderedTaskCount = TASK_COUNT_PER_STEP;
    remove(this.#loadMoreButtonComponent);
  };

  #renderTaskList = () => {
    render(this.#taskListComponent, this.#boardComponent.element);
    this.#renderTasks(0, Math.min(this.#boardTasks.length, TASK_COUNT_PER_STEP));

    if (this.#boardTasks.length > TASK_COUNT_PER_STEP) {
      this.#renderLoadMoreButton();
    }
  };

  #renderBoard = () => {
    render(this.#boardComponent, this.#boardContainer);

    if (this.#boardTasks.every((task) => task.isArchive)) {
      this.#renderNoTasks();
      return;
    }

    this.#renderSort();
    this.#renderTaskList();
  };
}
