#pragma strict

var controlAreaSets : Transform[];
var colorPalette : Transform;
var selectionItemAnchor : Transform;
var newSelectionPrefab : Transform;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;


var baseOffsetX : float = 0.15;
var baseOffsetY : float = -0.02;
var strideX : float = 0.195;
var strideY : float = -0.16;
var selectionsPerRow : int = 5;

private var isDragging : boolean;
private var buttonCount : int;
private var cameraControl : CameraControl;

function Start () {

   buttonCount = 0;
   isDragging = false;
}

function Update () {

}

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.R:
         if (!e.shift)
            cameraControl.snapToTopDownView();
         else
            cameraControl.snapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         cameraControl.snapToFocusLocation();
         break;

      case KeyCode.Escape:
         GUIControl.SwitchGUI(4); // temporary
         break;
      }
   }
}

function OnSwitchTo()
{
   cameraControl = Camera.main.GetComponent(CameraControl);
   UICamera.fallThrough = gameObject;
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (isPressed)
         {
            selectionBox._dragStartPosition = Input.mousePosition;
            selectionBox._dragEndPosition = Input.mousePosition;
         }
         else
         {
            if (selectionBox._isDragging)
            {
               var append : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
               if (!append)
                  Game.player.ClearSelectedTowers();

               selectionBox.Select();
               var selectionCount : int = 1;
               var xOffset : float = baseOffsetX;
               var yOffset : float = baseOffsetY;
               for (var go : GameObject in selectionBox.selectedObjects)
               {
                  var newButton : GameObject = NGUITools.AddChild(selectionItemAnchor.gameObject, newSelectionPrefab.gameObject);
                  newButton.transform.position.x += xOffset;
                  newButton.transform.position.y += yOffset;

                  xOffset += strideX; //(strideX * (selectionCount % selectionsPerRow));

                  if ((selectionCount % selectionsPerRow) == 0)
                  {
                     xOffset = baseOffsetX;
                     yOffset += strideY; //(strideY * (selectionCount / selectionsPerRow));
                  }

                  selectionCount += 1;
               }
            }
         }
         selectionBox._isDragging = false;
      break;
   }
}

function OnDrag(delta : Vector2)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (((selectionBox._dragStartPosition-Input.mousePosition).magnitude) > dragDistanceThreshold)
         {
            selectionBox._isDragging = true;
            selectionBox._dragEndPosition = Input.mousePosition;
         }
      break;
      // RMB
      case -2:
         cameraControl.Rotate(delta);
         isDragging = true;
      break;
      // MMB
      case -3:
         cameraControl.Pan(delta);
      break;
   }
}

function OnClick()
{
   // LMB
   if (UICamera.currentTouchID == -1)
   {
   }
   else if (UICamera.currentTouchID == -2)
   {
      DestroySelectionButtons();
   }
}

function OnDoubleClick()
{
   if (UICamera.currentTouchID == -1)
      cameraControl.snapToFocusLocation();
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function SwitchControlSet(newSet : int)
{
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
}

function DestroySelectionButtons()
{
   buttonCount = 0;
   for (var child : Transform in selectionItemAnchor)
      Destroy(child.gameObject);
}