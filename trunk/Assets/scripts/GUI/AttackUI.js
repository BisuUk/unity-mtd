#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorPalette : Transform;
var infoPanelAnchor : Transform;
var newSelectionPrefab : Transform;
var newEmitterQueueUnitPrefab : Transform;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;
var selectionsPerRow : int = 5;
var autoLaunchButton : UIButton;
var launchButton : UIButton;
var emitterStrengthButtons: UIButton[];
var emitterCost : UILabel;
var unitDetailPortrait : UIButton;
var unitDetailHealth : UISlider;
var infoPanelBackgroundBig : Transform;
var infoPanelBackgroundSmall : Transform;
var creditsLabel : UILabel;
var scoreLabel : UILabel;
var timeLabel : UILabel;

private var isDragging : boolean;
private var cameraControl : CameraControl;
private var abilityCursor : AbilityBase;
private var controlSet : int;
private var baseOffsetX : float = 0.15;
private var baseOffsetY : float = -0.02;
private var strideX : float = 0.195;
private var strideY : float = -0.16;
private var lastSelectedAbilityColor : Color = Color.white;


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
            cameraControl.SnapToTopDownView();
         else
            cameraControl.SnapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         cameraControl.SnapToFocusLocation();
         break;

      case KeyCode.Escape:
         UIControl.SwitchUI(2); // in game menu
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

   // Update launch button
   if (controlSet==3)
   {
      UpdateUnitDetails();
   }
   else
   {
      var emitter : Emitter = Game.player.selectedEmitter;
      if (emitter)
      {
         var cost : int = emitter.GetCost();
         var diff : int = Game.player.credits - cost;
         if (diff < 0)
         {
            emitterCost.color = Color.red;
            emitterCost.text = cost.ToString()+" ("+diff+")";
            launchButton.isEnabled = false;
         }
         else
         {
            emitterCost.color = Color.green;
            emitterCost.text = cost.ToString();
            launchButton.isEnabled = (emitter.isLaunchingQueue==false);
         }
      }
   }

   // Title bar
   scoreLabel.text = Game.control.score.ToString();

   creditsLabel.text = Game.player.credits.ToString()+" / "+Game.player.creditCapacity.ToString();
   creditsLabel.color = (Game.player.credits == Game.player.creditCapacity) ? Color.yellow : Color.green;

   var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
   var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
   timeLabel.text = minutes.ToString("#0")+":"+seconds.ToString("#00");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   cameraControl = Camera.main.GetComponent(CameraControl);
   UICamera.fallThrough = gameObject;
   SwitchControlSet(0);
   isDragging = false;
}

function SwitchControlSet(newSet : int)
{
   // 0=Default, abilities etc.
   // 1=Emitter controls
   // 2=Multi unit select
   // 3=Single unit select
   DestroyAbilityCursor();

   controlSet = newSet;
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
   Utility.SetActiveRecursive(colorPalette, (newSet==1));

   if (newSet==0)
      SetInfoBackground(0);
   else
      SetInfoBackground(2);
}

private function SetInfoBackground(style : int)
{
   infoPanelBackgroundSmall.gameObject.active = (style == 1);
   infoPanelBackgroundBig.gameObject.active = (style == 2);
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
               // Need to check for duplicates
               var append : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
               if (!append)
                  Game.player.ClearSelectedUnits();

               selectionBox.Select();
               for (var go : GameObject in selectionBox.selectedObjects)
               {
                  Game.player.SelectUnit(go.GetComponent(Unit), true);
               }

               CheckSelections();
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
   //RMB
   else if (UICamera.currentTouchID == -2)
   {
      if (!isDragging)
      {
         DestroyInfoPanelChildren();
         DestroyAbilityCursor();
         Game.player.selectedEmitter = null;
         Game.player.ClearSelectedUnits();
         SwitchControlSet(0);
      }
      isDragging = false;
   }
}

function OnDoubleClick()
{
   if (UICamera.currentTouchID == -1)
      cameraControl.SnapToFocusLocation();
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
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
   abilityCursor.SetColor(lastSelectedAbilityColor);
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

function CheckSelections()
{
   DestroyInfoPanelChildren();

   var selectionCount : int = 0;
   var xOffset : float = baseOffsetX;
   var yOffset : float = baseOffsetY;

   for (var unit : Unit in Game.player.selectedUnits)
   {
      var newButton : GameObject = NGUITools.AddChild(infoPanelAnchor.gameObject, newSelectionPrefab.gameObject);
      newButton.transform.position.x += xOffset;
      newButton.transform.position.y += yOffset;
      var b : AttackUISelectionButton = newButton.GetComponent(AttackUISelectionButton);
      b.attackUI = this;
      b.unit = unit;

      var captionString : String;
      switch (unit.unitType)
      {
         case 0: captionString = "Point"; break;
         case 1: captionString = "Heal"; break;
         case 2: captionString = "Shield"; break;
         case 3: captionString = "Stun"; break;
      }
      b.SetCaption(captionString);
      b.SetColor(unit.color);

      xOffset += strideX;

      if (((selectionCount+1) % selectionsPerRow) == 0)
      {
         xOffset = baseOffsetX;
         yOffset += strideY;
      }

      selectionCount += 1;
   }
   // Show details if it's just one unit
   if (selectionCount==0)
   {
      DestroyInfoPanelChildren();
      SwitchControlSet(0);
   }
   else if (selectionCount==1)
   {
      DestroyInfoPanelChildren();
      SwitchControlSet(3);
   }
   else
      SwitchControlSet(2);
}

function OnClickQueueUnitButton(unit : Unit)
{
   var shiftHeld : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
   var ctrlHeld : boolean = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);

   if (ctrlHeld)
      Game.player.FilterUnitType(unit.unitType);
   else if (shiftHeld)
      Game.player.DeselectUnit(unit);
   else
      Game.player.SelectUnit(unit, false);
   CheckSelections();
}

function OnClickUnit(unit : Unit)
{
   if (abilityCursor==null)
   {
      var shiftHeld : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
      var ctrlHeld : boolean = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);
   
      if (ctrlHeld)
         Game.player.SelectUnitType(unit.unitType);
      else
         Game.player.SelectUnit(unit, shiftHeld);
      CheckSelections();
   }
}

function UpdateUnitDetails()
{
   if (Game.player.selectedUnits.Count==1)
   {
      var u : Unit = Game.player.selectedUnits[0];
      // If dead return to default mode
      if (u == null)
         SwitchControlSet(0);
      else
      {
         unitDetailHealth.sliderValue = 1.0*u.health/u.maxHealth;
      }
   }
}

private function SetEmitterStrengthButton(which : int)
{
   var i : int = 0;
   for (i=0; i<emitterStrengthButtons.Length; i++)
   {
      emitterStrengthButtons[i].defaultColor = (which==i) ? Color.green : Color.white;
      emitterStrengthButtons[i].UpdateColor(true, false);
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
         b.cost.text = Game.unitCost.Cost(ua.unitType, emitter.strength).ToString();
   
         switch (ua.unitType)
         {
            case 0: b.caption.text = "Point"; break;
            case 1: b.caption.text = "Heal"; break;
            case 2: b.caption.text = "Shield"; break;
            case 3: b.caption.text = "Stun"; break;
         }
   
         b.background.color = emitter.color;
   
         if (queueCount == 1)
            Utility.SetActiveRecursive(newQueueUnit.transform.Find("ReorderButton").transform, false);
   
         xOffset += 0.255;
         queueCount += 1;
      }
   }
}

function OnAbility1()
{
   for (var unit : Unit in Game.player.selectedUnits)
   {
      if (Network.isClient)
         unit.netView.RPC("UseAbility1", RPCMode.Server);
      else
         unit.UseAbility1();
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

function OnUnitPortrait()
{
   if (Game.player.selectedUnits.Count==1)
   {
      var u : Unit = Game.player.selectedUnits[0];
      // If dead return to default mode
      if (u == null)
         SwitchControlSet(0);
      else
      {
         cameraControl.SnapToLocation(u.transform.position);
      }
   }
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
         UIControl.OnScreenMessage("Queue is full.", Color.red, 1.5);
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
   SetInfoBackground(1);
}

function OnPaintAbility()
{
   NewAbilityCursor(2);
   Utility.SetActiveRecursive(colorPalette, true);
   SetInfoBackground(1);
}

function OnStunAbility()
{
   NewAbilityCursor(3);
   Utility.SetActiveRecursive(colorPalette, true);
   SetInfoBackground(1);
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
   {
      abilityCursor.SetColor(color);
      lastSelectedAbilityColor = color;
   }
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