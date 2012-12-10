var selectionTag : String = "TOWER";
var color : Color;
var SelectionTexture : Texture;
var _selectionRect : Rect;
var _dragStartPosition : Vector2 ;
var _dragEndPosition : Vector2 ;
var _isDragging : boolean = false;
var selectedObjects : List.<GameObject>;


private var _fillRect : Rect ;
private var _emptyRect : Rect = new Rect(0, 0, 0, 0);

function Awake()
{
   selectedObjects = new List.<GameObject>();
}

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

function Select()
{
   var objs : GameObject[] = GameObject.FindGameObjectsWithTag(selectionTag);
   selectedObjects.Clear();
   for (var obj : GameObject in objs)
   {
      var currentScreenPoint : Vector2 = Camera.main.WorldToScreenPoint(obj.transform.position);
      if (_selectionRect.Contains(currentScreenPoint))
         selectedObjects.Add(obj);
   }
}