#pragma strict

var controlAreaSets : Transform[];
var colorPalette : Transform;
var infoPanelAnchor : Transform;
var newSelectionPrefab : Transform;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;
var baseOffsetX : float = 0.15;
var baseOffsetY : float = -0.02;
var strideX : float = 0.195;
var strideY : float = -0.16;
var selectionsPerRow : int = 5;

private var isDragging : boolean;
private var cameraControl : CameraControl;
private var abilityCursor : AbilityBase;


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

function Update()
{
   // WASD camera movement
   if (Input.GetKey(KeyCode.A))
      cameraControl.Pan(new Vector2(5,0));
   else if (Input.GetKey(KeyCode.D))
      cameraControl.Pan(new Vector2(-5,0));

   if (Input.GetKey(KeyCode.W))
      cameraControl.Zoom(0.1);
   else if (Input.GetKey(KeyCode.S))
      cameraControl.Zoom(-0.1);
}

function OnSwitchTo()
{
   cameraControl = Camera.main.GetComponent(CameraControl);
   UICamera.fallThrough = gameObject;
   SwitchControlSet(0);
   isDragging = false;
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
                  var newButton : GameObject = NGUITools.AddChild(infoPanelAnchor.gameObject, newSelectionPrefab.gameObject);
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
               SwitchControlSet(2);
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
      if (abilityCursor)
      {
         // TODO:Check cost

         // Cast ability
         if (!Network.isClient)
            Game.control.CastAbility(
               abilityCursor.ID,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityCursor.color.g,
               abilityCursor.color.b,
               new NetworkMessageInfo());
         else
            Game.control.netView.RPC("CastAbility", RPCMode.Server,
               abilityCursor.ID,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityCursor.color.g,
               abilityCursor.color.b);
      }
   }
   else if (UICamera.currentTouchID == -2)
   {
      DestroySelectionButtons();
      DestroyAbilityCursor();
      SwitchControlSet(0);
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

   Utility.SetActiveRecursive(colorPalette, (newSet==1));
}

function DestroySelectionButtons()
{
   for (var child : Transform in infoPanelAnchor)
      Destroy(child.gameObject);
   SwitchControlSet(0);
}

function NewAbilityCursor(type : int)
{
   DestroyAbilityCursor();

   var cursorObject : GameObject = Instantiate(Resources.Load(AbilityBase.GetPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "AttackAbilityCursor";
   cursorObject.tag = "";
   cursorObject.SendMessage("MakeCursor", true);
   cursorObject.collider.enabled = false;
   abilityCursor = cursorObject.GetComponent(AbilityBase);
}

function DestroyAbilityCursor()
{
   if (abilityCursor)
   {
      for (var child : Transform in abilityCursor.transform)
         Destroy(child.gameObject);
      Destroy(abilityCursor.gameObject);
   }
}

function OnHasteAbility()
{
   NewAbilityCursor(1);
   Utility.SetActiveRecursive(colorPalette, true);
}

function OnPaintAbility()
{
   NewAbilityCursor(2);
   Utility.SetActiveRecursive(colorPalette, true);
}

function OnStunAbility()
{
   NewAbilityCursor(3);
   Utility.SetActiveRecursive(colorPalette, true);
}

function OnWhite()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.white);
}

function OnBlue()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.blue);
}

function OnMagenta()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.magenta);
}

function OnRed()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.red);
}

function OnYellow()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.yellow);
}

function OnGreen()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.green);
}

function OnCyan()
{
   if (abilityCursor)
      abilityCursor.SetColor(Color.cyan);
}