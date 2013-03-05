#pragma strict
#pragma downcast

static var uiIndex : int = 0;

var controlAreaSets : Transform[];
var colorPalette : Transform;
var colorRedWidget : UICheckbox;
var colorBlueWidget : UICheckbox;
var colorYellowWidget : UICheckbox;
var colorWashWidget : UICheckbox;
var brushEnvWidget : UICheckbox;
var brushUnitWidget : UICheckbox;
var speedControls : Transform;
var unitsPar : UILabel;
var timePar : UILabel;
var unitsUsedMax : UILabel;
var time : UILabel;
var playPauseButton : Transform;
var emitterWidgetStart : Transform;
var emitterWidgetPrefab : Transform;
var endGoalWidgetStart : Transform;
var endGoalWidgetPrefab : Transform;
var tipManager : TipManager;

private var isDragging : boolean;
private var cameraControl : CameraControl;
private var controlSet : int;
private var setNewControlSet : boolean;
private var endGoalWidgets : List.<EndGoalWidget>;
private var currentColor : Color;
private var processedMouseEvent : boolean;
private var visitedOnce : boolean;

function Awake()
{
   endGoalWidgets = List.<EndGoalWidget>();
   currentColor = Color.black;
}

function Start()
{
   speedControls.gameObject.SetActive(!Network.isClient);
}

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey)
   {
      if (e.type==EventType.KeyDown)
      {
         switch (e.keyCode)
         {
         case KeyCode.F:
            cameraControl.SnapToFocusMouseLocation();
            break;
   
         case KeyCode.Escape:
            UIControl.SwitchUI(2); // in game menu
            break;
   
         case KeyCode.Alpha1:
            colorBlueWidget.isChecked = true;
            OnBlue();
            break;
         case KeyCode.Alpha2:
            colorRedWidget.isChecked = true;
            OnRed();
            break;
   
         case KeyCode.Alpha3:
            colorYellowWidget.isChecked = true;
            OnYellow();
            break;
   
         case KeyCode.Alpha4:
         case KeyCode.E:
            colorWashWidget.isChecked = true;
            OnButton3();
            break;
   
         case KeyCode.Space:
            OnPlayPause();
            break;
   
         case KeyCode.Z:
            OnDecreaseGameSpeed();
            break;
   
         case KeyCode.X:
            OnResetGameSpeed();
            break;
   
         case KeyCode.C:
            OnIncreaseGameSpeed();
            break;
   
         case KeyCode.Tab:
            if (brushEnvWidget.isChecked)
               brushUnitWidget.isChecked = true;
            else
               brushEnvWidget.isChecked = true;
            break;
         }
      }
   }
}

function OnSwitchFrom()
{
   Game.player.ClearAllSelections();
   UIControl.PanelTooltip("");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   cameraControl = Camera.main.GetComponent(CameraControl);
   UICamera.fallThrough = gameObject;
   SwitchControlSet(0);
   isDragging = false;

   colorBlueWidget.gameObject.SetActive(Game.map.allowBlue);
   colorRedWidget.gameObject.SetActive(Game.map.allowRed);
   colorYellowWidget.gameObject.SetActive(Game.map.allowYellow);

   if (visitedOnce == false)
   {
      // Sending blank string will close the window
      tipManager.ShowTip(Game.map.startingTip);
      visitedOnce = true;
   }
}

function SwitchControlSet(newSet : int)
{
   // We don't make immediately active here because we get
   // weird click through when selecting paint pot. Set in LateUpdate.
   controlSet = newSet;
   setNewControlSet = true;
}

function Update()
{
   // Units used versus max
   unitsUsedMax.text = Game.control.numUnitsUsed.ToString() + " / " + Game.map.unitMax.ToString();

   var str : String;
   if (Game.control.numUnitsUsed < Game.map.unitPar)
      str = "[00FF00]";
   else if (Game.control.numUnitsUsed == Game.map.unitPar)
      str = "[FFFF00]";
   else
      str = "[FF0000]";
   str += Game.map.unitPar.ToString() + " (" + (Game.control.numUnitsUsed - Game.map.unitPar).ToString() + ")";
   unitsPar.text = str;

   // Time
   var minutes : float = Mathf.Floor(Game.control.levelTime/60.0);
   var seconds : float = Mathf.Floor(Game.control.levelTime%60.0);
   str = minutes.ToString("#0")+":"+seconds.ToString("#00");
   time.text = minutes.ToString("#0")+":"+seconds.ToString("#00");

   // Time Par
   if (Game.control.levelTime < Game.map.timeBonusLimit)
      str = "[00FF00]";
   else
      str = "[FF0000]";
   minutes = Mathf.Floor(Game.map.timeBonusLimit/60.0);
   seconds = Mathf.Floor(Game.map.timeBonusLimit%60.0);
   str += "(" + minutes.ToString("#0")+":"+seconds.ToString("#00") + ")";
   timePar.text = str;
}

function LateUpdate()
{
   if (setNewControlSet)
   {
      for (var i : int=0; i<controlAreaSets.length; i++)
         controlAreaSets[i].gameObject.SetActive(i == controlSet);
      setNewControlSet = false;
   }
}

function UnitTouchTrigger(info : UnitTouchTriggerInfo)
{
   // Unit touched a tutorial trigger thingy
   if (info.on)
   {
      if (tipManager.showTips.isChecked)
      {
         tipManager.ShowTip(info.strData);
         if (info.associate)
            cameraControl.SnapTo(info.associate.position, info.floatData);
         // Set intData to 1 to pause
         if (info.intData == 1)
            Game.control.PlayPauseToggle();
      }
   }
}

// Preceeds OnPress
function OnPressUnit(unit : UnitSimple)
{
   //if (Game.player.selectedStructure && Game.player.selectedStructure.canBeAimed)
   //   return;

   if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
   {
      PaintUnit(unit);
      processedMouseEvent = true;
   }
}

// Preceeds OnPress
function OnPressRedirector(controller : RedirectorController)
{
   if (Game.player.selectedStructure && Game.player.selectedStructure.canBeAimed)
      return;

   controller.Redirect();
   processedMouseEvent = true;
}

// Preceeds OnPress
function OnPressSplatter(splatter : AbilitySplatter)
{
}

// Preceeds OnPress
function OnPressStructure(structure : Structure)
{
   // So paint unit still works...
   if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
      return;

   Game.player.SelectStructure(structure);

   if (structure as Emitter != null)
   {
      //SwitchControlSet(1);
      OnLaunch();
      Game.player.ClearSelectedStructure();
   }
   else
   {
      //cameraControl.SnapTo(structure.transform.position);
   }
   //{
      SwitchControlSet(0);
   //}

   processedMouseEvent = true;
}

function OnPressEmitterWidget(emitter : Emitter)
{
   //Debug.Log("PuzzleUI:OnPressEmitterWidget");
   //cameraControl.SnapToFocusLocation(emitter.transform.position, false);
   //OnPressStructure(emitter);
   if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
      OnPressStructure(emitter);
   else
      cameraControl.SnapTo(emitter.transform.position);
}

function OnPressEndGoalWidget(goal : GoalStation)
{
   //Debug.Log("PuzzleUI:OnPressEndGoalWidget");
   //cameraControl.SnapToFocusLocation(goal.transform.position, false);
   cameraControl.SnapTo(goal.transform.position);
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (processedMouseEvent == false)
         {
            if (isPressed)
            {
               if (Game.player.selectedStructure)
               {
                  if ( Game.player.selectedStructure.canBeAimed)
                     Game.player.selectedStructure.OnPress(isPressed);
               }
               else
               {
                  if (brushEnvWidget.isChecked == false || Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
                     PaintUnit(GetClosestUnitOnScreen(Input.mousePosition, 50.0f));
                  else
                     Paint(Game.control.GetMouseWorldPosition());
               }
            }
            else
            {
               if (Game.player.selectedStructure && Game.player.selectedStructure.canBeAimed)
                  Game.player.selectedStructure.OnPress(isPressed);
            }
         }
         break;

      // RMB
      case -2:
         if (isPressed == false && isDragging == false) // mouseup
         {
            if (Game.player.selectedStructure && Game.player.selectedStructure.isAiming)
            {
               Game.player.selectedStructure.CancelAim();
            }
            else
            {
               Game.player.ClearAllSelections();
               SwitchControlSet(0);
               UIControl.PanelTooltip("");
            }
         }
         break;
   }
}

function OnDrag(delta : Vector2)
{
   isDragging = true;

   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (processedMouseEvent == false)
         {
            if (Game.player.selectedStructure && Game.player.selectedStructure.isAiming)
            {
            }
            else if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
            {
               // spam paint unit?
            }
            else if (brushEnvWidget.isChecked)
            {
               // Draw ray from camera mousepoint to ground plane.
               Paint(Game.control.GetMouseWorldPosition());
            }
         }

      break;
      // RMB
      case -2:
         cameraControl.Rotate(delta);
      break;
      // MMB
      case -3:
         if (Game.player.selectedStructure && Game.player.selectedStructure.isAiming)
            cameraControl.Pan(delta, false);
         else
            cameraControl.Pan(delta, false);
      break;
   }
}

// Called after OnPress(false)
function OnClick()
{
   // LMB
   if (UICamera.currentTouchID == -1)
   {
      //splatter
      processedMouseEvent = false;
   }
   isDragging = false;
}

function OnDoubleClick()
{
   //LMB
   if (UICamera.currentTouchID == -1)
   {
   }
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnHoverSplatterIn(splatter : AbilitySplatter)
{
}

function OnHoverSplatterOut(splatter : AbilitySplatter)
{
}

function OnMouseEnterUnit(unit : UnitSimple)
{
   unit.SetHovered(true);
   //unit.SetHudVisible(true);
   //UIControl.PanelTooltip(unit.GetToolTipString());
}

function OnMouseExitUnit(unit : UnitSimple)
{
   unit.SetHovered(false);
   //unit.SetHudVisible(false);
   UIControl.PanelTooltip("");

}

function OnMouseEnterTower(tower : Tower)
{
}

function OnMouseExitTower(tower : Tower)
{
}

function OnMouseEnterEmitter(emitter : Emitter)
{
}

function OnMouseExitEmitter(emitter : Emitter)
{
}

function OnUnitReachedGoal(goal : GoalStation)
{
   Debug.Log("PuzzleUI:OnUnitReachedGoal: index="+goal.assignedIndex);
   for (var goalWidget : EndGoalWidget in endGoalWidgets)
   {
      if (goalWidget.goal == goal)
         goalWidget.UnitReachedGoal();
   }
}

function OnCreateWidgets()
{
	CreateEmitterIcons();
	CreateEndGoalIcons();
}

function CreateEmitterIcons()
{
   var xStride : float = 30;
   var count : float = 0;
   for (var emitter : Emitter in Game.control.emitters)
   {
      var newWidget : GameObject = NGUITools.AddChild(emitterWidgetStart.gameObject, emitterWidgetPrefab.gameObject);
      newWidget.transform.localPosition.x += (xStride * count);
      newWidget.transform.localScale = Vector3(0.077, 0.25, 0.25);
      count += 1;

      Debug.Log("PuzzleUI:CreateEmitterIcons");

      var newEmitterButton : EmitterWidget = newWidget.GetComponent(EmitterWidget);
      newEmitterButton.emitter = emitter;
   }
}

function CreateEndGoalIcons()
{
   var yStride : float = -30;
   var count : float = 0;
   for (var goal : GoalStation in Game.control.goals)
   {
      var newWidget : GameObject = NGUITools.AddChild(endGoalWidgetStart.gameObject, endGoalWidgetPrefab.gameObject);
      newWidget.transform.localPosition.y += (yStride * count);
      count += 1;

      Debug.Log("PuzzleUI:CreateEndGoalIcons: index="+goal.assignedIndex);

      var newGoalWidget : EndGoalWidget = newWidget.GetComponent(EndGoalWidget);
      newGoalWidget.goal = goal;
      if (newGoalWidget)
      {
      	endGoalWidgets.Add(newGoalWidget);
		   for (var c : Color in goal.requiredColors)
   			newGoalWidget.AddUnitIcon(c);
      }
   }
}

function OnLaunch()
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      Game.control.StartLevelTimer();
      // Clear and readd one point unit, and launch.
      // Probably can just do this once at emitter Start().
      emitter.ClearQueue();
      AddUnitToQueue(0);
      emitter.Launch();
   }
}

private function AddUnitToQueue(type : int)
{
   var emitter : Emitter = null;
   if (Game.player.selectedStructure)
      emitter = Game.player.selectedStructure.GetComponent(Emitter);
   if (emitter)
   {
      var ua : UnitAttributes = new UnitAttributes();
      ua.unitType = type;
      ua.size = 0.0;
      ua.strength = 0.0;
      ua.color = emitter.color;
      if (!emitter.AddToQueue(ua))
         UIControl.OnScreenMessage("Queue is full.", Color.red, 1.5);
   }
}

function OnButton3()
{
   //Game.player.ClearAllSelections();
   //SwitchControlSet(0);
   SetColor(Color.black);
}

function OnEnvironmentBrush()
{

}

function OnUnitBrush()
{

}

function Paint(hit : RaycastHit)
{
   if (hit.collider.transform.tag == "NOPAINT")
      return;

   var splats : Collider[] = Physics.OverlapSphere(hit.point, 0.2, (1 << 13));
   if (splats.Length == 0)
   {
      if (currentColor != Color.black)
      {
         var splat : AbilitySplatter = Instantiate(Game.prefab.Ability(0), hit.point, Quaternion.identity).GetComponent(AbilitySplatter);
         splat.Init(hit, currentColor);
      }
   }
   else // hit an existing splat (or several)
   {
      for (var c : Collider in splats)
      {
         // Wash if color is black
         if (currentColor == Color.black)
         {
            c.gameObject.GetComponent(AbilitySplatter).Wash();
            Destroy(c.gameObject, 0.01);
         }
         else
         {
            c.gameObject.GetComponent(AbilitySplatter).SetColor(currentColor);
         }
      }
   }
}

function PaintUnit(unit : UnitSimple)
{
   if (unit && Game.map.allowUnitPainting)
   {
      var newColor : Color = currentColor;
      if (currentColor == Color.black)
         //newColor = Color.white;
         unit.Splat();
      else
         unit.SetColor(newColor);
   }
}

function GetClosestUnitOnScreen(pos : Vector2, withinPixels : float)
{
   var closest : Transform = null;
   var closestRange : float = Mathf.Infinity;

   var gos : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
   for (var go : GameObject in gos)
   {
      var dist : float = Vector2.Distance(pos, Camera.main.WorldToScreenPoint(go.transform.position));
      if (dist <= withinPixels && dist < closestRange)
      {
         closestRange = dist;
         closest = go.transform;
      }
   }

   return (closest) ? closest.GetComponent(UnitSimple) : null;
}

private function SetColor(color : Color)
{
   switch (color)
   {
      case Color.blue:
         if (Game.map.allowBlue)
            currentColor = color;
         break;

      case Color.red:
         if (Game.map.allowRed)
            currentColor = color;
         break;

      case Utility.colorYellow:
         if (Game.map.allowYellow)
            currentColor = color;
         break;

      case Color.black:
         currentColor = color;
         break;
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
   //SetColor(Color.yellow);
   SetColor(Color(1.0, 1.0, 0.0, 1.0));
}

function OnGreen()
{
   SetColor(Color.green);
}

function OnCyan()
{
   SetColor(Color.cyan);
}

function OnDecreaseGameSpeed()
{
   Game.control.SpeedChange(false);
}

function OnIncreaseGameSpeed()
{
   Game.control.SpeedChange(true);
}

function OnResetGameSpeed()
{
   Game.control.SpeedReset(true);
}

function OnPlayPause()
{
   Game.control.PlayPauseToggle();

   // Toggle button color
   var button : UIButton = playPauseButton.GetComponent(UIButton);
   var color : Color = (Time.timeScale == 0.0) ? Color.red : Color.green;;
   button.defaultColor = color;
   button.hover = color;
   button.UpdateColor(true, true);
}

function OnTooltipTrigger(data : TooltipTriggerData)
{
   // Hide
   if (!data.enterHover)
   {
      if (data.usePanelTooltip)
         UIControl.PanelTooltip("");
      else
         UIControl.HoverTooltip("", data.offset);
   }
   else // Make visible
   {
      var tooltipString : String;
      tooltipString = data.text;
      var emitter : Emitter = null;
      if (Game.player.selectedStructure)
         emitter = Game.player.selectedStructure.GetComponent(Emitter);
      // Some tooltips require some dynamic data, add that here.
      switch (data.id)
      {
         case WidgetIDEnum.BUTTON_UNIT_POINT:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(0, emitter.strength);
         break;
         case WidgetIDEnum.BUTTON_UNIT_HEALER:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(1, emitter.strength);
         break;
         case WidgetIDEnum.BUTTON_UNIT_SHIELD:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(2, emitter.strength);
         break;
         case WidgetIDEnum.BUTTON_UNIT_STUNNER:
            if (emitter)
               tooltipString = tooltipString+"\\nCost: [00FF00]"+Game.costs.Unit(3, emitter.strength);
         case WidgetIDEnum.BUTTON_EMITTER_LAUNCH:
            if (emitter)
               tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+emitter.GetCost();
         break;
         case WidgetIDEnum.BUTTON_ABILITY_DASH:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(2);
         break;
         case WidgetIDEnum.BUTTON_ABILITY_SLOW:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(4);
         break;
         case WidgetIDEnum.BUTTON_ABILITY_PAINT:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(1);
         break;
         case WidgetIDEnum.BUTTON_ABILITY_STUN:
            tooltipString = tooltipString+"\\n\\nCost: [00FF00]"+Game.costs.Ability(3);
         break;

      }

      // Panel tooltip is right above the user controls
      if (data.usePanelTooltip)
         UIControl.PanelTooltip(tooltipString);
      else
      {
         // For the hover tooltip, we get the hovered widgets screen pos,
         // otherwise we use the mouse pos.
         if (data.offsetFromWidget)
         {
            var widgetScreenPos : Vector2 = UICamera.mainCamera.WorldToScreenPoint(data.widget.position);
            UIControl.HoverTooltip(tooltipString, widgetScreenPos + data.offset);
         }
         else
            UIControl.HoverTooltip(tooltipString, Input.mousePosition + data.offset);
      }
   }
}