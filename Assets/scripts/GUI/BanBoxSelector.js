var SelectionButton : int;
var color : Color;
var SelectionTexture : Texture;
var _selectionRect : Rect;
var _dragStartPosition : Vector2 ;
var _dragEndPosition : Vector2 ;
var _isDragging : boolean = false;

private var _hasStarted : boolean = false;
private var _mousePosition : Vector3 ;
private var _fillRect : Rect ;
private var _emptyRect : Rect = new Rect(0, 0, 0, 0);
private var MIN_DRAG_DISTANCE : float = 10;


function OnGUI()
{
   if (_isDragging)
   {
      GetScreenRect();
      GetFillRect();
      GUI.color = color;
      GUI.DrawTexture(_fillRect, SelectionTexture, ScaleMode.StretchToFill, true);
   }
   else
   {
      _selectionRect = _emptyRect;
   }
}

// Update is called once per frame
function Update ()
{
   _mousePosition = Input.mousePosition;

   //check for mouse button press, release, and down
   if (Input.GetMouseButtonDown(SelectionButton))
   {
      LeftMousePressed(_mousePosition);
   }

   if (Input.GetMouseButtonUp(SelectionButton))
   {
      LeftMouseReleased(_mousePosition);
   }

   if (Input.GetMouseButton(SelectionButton))
   {
      LeftMouseDrag(_mousePosition);
   }
}

private function LeftMouseDrag(mousePosition : Vector2)
{
   var diff : Vector2 = mousePosition - _dragStartPosition;
   if (_hasStarted && mousePosition != _dragStartPosition && diff.magnitude >= MIN_DRAG_DISTANCE)
   {
      _isDragging = true;
      _dragEndPosition = mousePosition;
   }
}

private function LeftMouseReleased(mousePosition : Vector2)
{
   if (_hasStarted && _isDragging)
   {
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("TOWER");
      var numSelected : int = 0;
      var firstTower : Tower = null;

      Game.player.ClearSelectedTowers();

      for (var obj : GameObject in objs)
      {
         var currentScreenPoint : Vector2 = Camera.main.WorldToScreenPoint(obj.transform.position);

         if (_selectionRect.Contains(currentScreenPoint))
         {
            if (numSelected == 0)
               firstTower = obj.GetComponent(Tower);

            numSelected += 1;
            Game.player.SelectTower(obj.GetComponent(Tower), true);
         }
      }

      if (numSelected == 1)
         GUIControl.defendGUI.defendPanel.SetTower(firstTower, false);
      else if (numSelected > 1)
         GUIControl.defendGUI.defendPanel.SetMultiTower();

   }
   _isDragging = false;
   _dragEndPosition = mousePosition;
}

private function LeftMousePressed(mousePosition : Vector2)
{
/*
   if (GUIControl.cursorObject)
   {
      _isDragging = false;
      _hasStarted = false;
   }
   else if (GUIControl.defendGUI.defendPanel.enabled)
   {
      if (mousePosition.x >= GUIControl.defendGUI.defendPanel.panelWidth)
      {
         _dragStartPosition = mousePosition;
         _hasStarted = true;
      }
      else
      {
         _isDragging = false;
         _hasStarted = false;
      }
   }
   else
   {
      _dragStartPosition = mousePosition;
      _hasStarted = true;
   }
*/   
}

/// <summary>
/// creates the selection rectangle, normalizing the points so that the
/// values are always positive
/// </summary>
private function GetFillRect()
{
   //to start, we assume the user is dragging down and to the right, since this will always yield
   //positive width and height
   var x : float = _dragStartPosition.x;
   var y : float = _dragStartPosition.y;
   var width : float = _dragEndPosition.x - _dragStartPosition.x;
   var height : float = (Screen.height - _dragEndPosition.y) - (Screen.height - _dragStartPosition.y);

   //if the width is negative (user is dragging leftward), swap the x position and make the width positive
   if (width < 0)
   {
      x = _dragEndPosition.x;
      width = Mathf.Abs(width);
   }

   //if the height is negative (user is draggin upward), swap the y position and make the height positive
   if (height < 0)
   {
      y = _dragEndPosition.y;
      height = Mathf.Abs(height);
   }

   //set the rectangle based on the values
   _fillRect.x = x;
   _fillRect.y = Screen.height - y;
   _fillRect.width = width;
   _fillRect.height = height;
}

private function GetScreenRect()
{
   var x : float = _dragStartPosition.x;
   var y : float = _dragStartPosition.y;
   var width : float = _dragEndPosition.x - _dragStartPosition.x;
   var height : float = _dragEndPosition.y - _dragStartPosition.y;

   if (width < 0)
   {
      x = _dragEndPosition.x;
      width *= -1;
   }

   if (height < 0)
   {
      y = _dragEndPosition.y;
      height *= -1;
   }

   _selectionRect.x = x;
   _selectionRect.y = y;
   _selectionRect.width = width;
   _selectionRect.height = height;
}

function OnSwitchGUI(id : int)
{
   enabled = (id==GUIControl.defendGUI.guiID);
}

