#pragma strict

var controlAreaSets : Transform[];
var colorPalette : Transform;
var infoPanelAnchor : Transform;
var newSelectionPrefab : Transform;
var newEmitterQueueUnitPrefab : Transform;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;
var baseOffsetX : float = 0.15;
var baseOffsetY : float = -0.02;
var strideX : float = 0.195;
var strideY : float = -0.16;
var selectionsPerRow : int = 5;
var autoLaunchButton : UIButton;
var emitterStrengthButtons: UIButton[];

private var isDragging : boolean;
private var cameraControl : CameraControl;
private var abilityCursor : AbilityBase;
private var controlSet : int;


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
         GUIControl.SwitchGUI(2); // in game menu
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
               //var append : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
               //if (!append)
                  //Game.player.ClearSelectedTowers();

               DestroyInfoPanelChildren();

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
      if (!isDragging)
      {
         DestroyInfoPanelChildren();
         DestroyAbilityCursor();
         Game.player.selectedEmitter = null;
         SwitchControlSet(0);
      }
      isDragging = false;
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
   controlSet = newSet;
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
   Utility.SetActiveRecursive(colorPalette, (newSet==1));
}

function DestroyInfoPanelChildren()
{
   for (var child : Transform in infoPanelAnchor)
      Destroy(child.gameObject);
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

private function SetEmitterStrengthButton(which : int)
{
   var i : int = 0;
   for (i=0; i<emitterStrengthButtons.Length; i++)
   {
      emitterStrengthButtons[i].defaultColor = (which==i) ? Color.green : Color.white;
      emitterStrengthButtons[i].UpdateColor(true, false);
      //emitterStrengthButtons[i].Find("Background").GetComponent(UISlicedSprite).color = (which==i) ? Color.yellow : Color.black;
   }
}

private function UpdateEmitterInfo()
{
   DestroyInfoPanelChildren();

   var emitter : Emitter = Game.player.selectedEmitter;

   if (emitter)
   {
      var queueCount : int = 1;
      var xOffset : float = baseOffsetX;
      var yOffset : float = -0.2;

      autoLaunchButton.defaultColor = (emitter.autoLaunch) ? Color.green : Color.white;
      autoLaunchButton.UpdateColor(true, false);

      switch (emitter.strength)
      {
         case 1.0: SetEmitterStrengthButton(2); break;
         case 0.5: SetEmitterStrengthButton(1); break;
         case 0.0: SetEmitterStrengthButton(0); break;
      }
   
      for (var ua : UnitAttributes in emitter.unitQueue)
      {
         var newQueueUnit : GameObject = NGUITools.AddChild(infoPanelAnchor.gameObject, newEmitterQueueUnitPrefab.gameObject);
         newQueueUnit.transform.position.x += xOffset;
         newQueueUnit.transform.position.y += yOffset;
         var b : AttackUIEmitterQueueButton = newQueueUnit.GetComponent(AttackUIEmitterQueueButton);
         b.attackUI = this;
         b.queuePosition = queueCount-1;
   
         switch (ua.unitType)
         {
            case 0: b.caption.text = "Point"; break;
            case 1: b.caption.text = "Heal"; break;
            case 2: b.caption.text = "Shield"; break;
            case 3: b.caption.text = "Stun"; break;
         }
   
         b.background.color = emitter.color;
   
         if (queueCount == 1)
            Utility.SetActiveRecursive(newQueueUnit.Find("ReorderButton").transform, false);
   
         xOffset += 0.255; //(strideX * (selectionCount % selectionsPerRow));
         queueCount += 1;
      }
   }
}

private function SetStrength(newStrength : float)
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      emitter.SetStrength(newStrength);
      UpdateEmitterInfo();
   }
}

function OnEmitterHeavy()
{
   SetStrength(1.0);
}

function OnEmitterMedium()
{
   SetStrength(0.5);
}

function OnEmitterLight()
{
   SetStrength(0.0);
}

function OnSelectQueueUnit(index : int)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
      break;
      // RMB
      case -2:
         var emitter : Emitter = Game.player.selectedEmitter;
         if (emitter)
            emitter.RemoveFromQueue(index);
         UpdateEmitterInfo();
      break;
   }
}

function OnRemoveQueueUnit(index : int)
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
      emitter.RemoveFromQueue(index);
   UpdateEmitterInfo();
}

function OnReorderQueueUnit(index : int)
{
   if (index < 1)
      return;

   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      emitter.MoveInQueue(index-1, false);
      UpdateEmitterInfo();
   }
}

function OnSelectEmitter()
{
   SwitchControlSet(1);
   UpdateEmitterInfo();
}

function OnLaunch()
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
      emitter.Launch();
}

function OnAutoLaunch()
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      emitter.autoLaunch = !emitter.autoLaunch;
      autoLaunchButton.defaultColor = (emitter.autoLaunch) ? Color.green : Color.white;
   }
}

function OnReset()
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
      emitter.Reset();
   UpdateEmitterInfo();
}

private function AddUnitToQueue(type : int)
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      var ua : UnitAttributes = new UnitAttributes();
      ua.unitType = type;
      ua.size = 0.0;
      ua.strength = 0.0;
      ua.color = Color.white;
      if (!emitter.AddToQueue(ua))
         GUIControl.OnScreenMessage("Queue is full.", Color.red, 1.5);
   }
   UpdateEmitterInfo();
}

function OnPoint()
{
   AddUnitToQueue(0);
}

function OnHealer()
{
   AddUnitToQueue(1);
}

function OnShield()
{
   AddUnitToQueue(2);
}

function OnStunner()
{
   AddUnitToQueue(3);
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

private function SetColor(color : Color)
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      emitter.SetColor(color);
      UpdateEmitterInfo();
   }
   else if (abilityCursor)
      abilityCursor.SetColor(color);
}

function OnWhite()
{
   SetColor(Color.white);
}

function OnBlue()
{
   SetColor(Color.blue);
}

function OnMagenta()
{
   SetColor(Color.magenta);
}

function OnRed()
{
   SetColor(Color.red);
}

function OnYellow()
{
   SetColor(Color.yellow);
}

function OnGreen()
{
   SetColor(Color.green);
}

function OnCyan()
{
   SetColor(Color.cyan);
}