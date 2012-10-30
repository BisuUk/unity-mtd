#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var increaseGameSpeedButton : UIButton;
var decreaseGameSpeedButton : UIButton;
var creditsText : UILabel;
var scoreText : UILabel;
var timeText : UILabel;

private var isDragging : boolean;
private var cameraControl : CameraControl2;
private var abilityCursor : AbilityBase;
private var controlSet : int;
private var lastSelectedAbilityColor : Color = Game.defaultColor;
private var hoverUnit : Unit;

function Start()
{
   Utility.SetActiveRecursive(increaseGameSpeedButton.transform, !Network.isClient);
   Utility.SetActiveRecursive(decreaseGameSpeedButton.transform, !Network.isClient);
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
            cameraControl.SnapToTopDownView();
         else
            cameraControl.SnapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         cameraControl.SnapToFocusMouseLocation();
         break;

      case KeyCode.Escape:
         UIControl.SwitchUI(2); // in game menu
         break;
      }
   }
}

function Update()
{
   // Title bar
   scoreText.text = Game.control.score.ToString();

   creditsText.text = Game.player.credits.ToString();
   if (Game.map.useCreditCapacities)
      creditsText.text += (" / "+Game.player.creditCapacity.ToString());
   creditsText.color = (Game.player.credits == Game.player.creditCapacity) ? Color.yellow : Color.green;

   var minutes : float = Mathf.Floor(Game.control.roundTime/60.0);
   var seconds : float = Mathf.Floor(Game.control.roundTime%60.0);
   timeText.text = minutes.ToString("#0")+":"+seconds.ToString("#00");
}

function OnSwitchFrom()
{
   DestroyAbilityCursor();
   Game.player.ClearAllSelections();
   UIControl.PanelTooltip("");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   cameraControl = Camera.main.GetComponent(CameraControl2);
   UICamera.fallThrough = gameObject;
   SwitchControlSet(0);
   isDragging = false;
}

function SwitchControlSet(newSet : int)
{
   // 0=Default, abilities etc.
   DestroyAbilityCursor();

   controlSet = newSet;
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
      break;
   }
}

function OnDrag(delta : Vector2)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
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
         // Check player can afford, will also be checked on server
         var cost : int = Game.costs.Ability(abilityCursor.ID);
         if (Game.control.CanPlayerAfford(cost))
         {
            // Deduct cost, server will update as well
            Game.player.credits -= cost;

            // Cast ability
            if (!Network.isClient)
               Game.control.CastAbility(
                  abilityCursor.ID,
                  abilityCursor.transform.position,
                  abilityCursor.color.r,
                  abilityCursor.color.g,
                  abilityCursor.color.b,
                  new NetworkMessageInfo());
            else
               Game.control.netView.RPC("CastAbility", RPCMode.Server,
                  abilityCursor.ID,
                  abilityCursor.transform.position,
                  abilityCursor.color.r,
                  abilityCursor.color.g,
                  abilityCursor.color.b);
         }
         else
         {
            UIControl.OnScreenMessage("Not enough credits.", Color.red, 1.5);
         }
      }
   }
   //RMB
   else if (UICamera.currentTouchID == -2)
   {
      if (!isDragging)
      {
         //if (cameraControl.isZoomedOut)
         //   cameraControl.SnapToFocusMouseLocation();
         //else
         //{
            DestroyAbilityCursor();
            Game.player.ClearAllSelections();
            SwitchControlSet(0);
            UIControl.PanelTooltip("");
         //}
      }
      else
      {
         //cameraControl.Reorient();
         cameraControl.SetRotating(false);
      }

      isDragging = false;
   }
}

function OnDoubleClick()
{
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnMouseEnterUnit(unit : Unit)
{
   if (abilityCursor==null)
   {
      hoverUnit = unit;
      unit.SetHovered(true);
      unit.SetHudVisible(true);
      UIControl.PanelTooltip(unit.GetToolTipString());
   }
}

function OnMouseExitUnit(unit : Unit)
{
   if (abilityCursor==null)
   {
      if (hoverUnit == unit)
         hoverUnit = null;
      unit.SetHovered(false);
      unit.SetHudVisible(false);
      UIControl.PanelTooltip("");
   }
}

function OnMouseEnterTower(tower : Tower)
{
   if (abilityCursor==null)
      tower.SetHovered(true);
}

function OnMouseExitTower(tower : Tower)
{
   if (abilityCursor==null)
      tower.SetHovered(false);
}

function OnMouseEnterEmitter(emitter : Emitter)
{
   if (abilityCursor==null)
      emitter.SetHovered(true);
}

function OnMouseExitEmitter(emitter : Emitter)
{
   if (abilityCursor==null)
      emitter.SetHovered(false);
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
   }
}

function OnSelectEmitter(emitter : Emitter)
{

   var selectedEmitter : Emitter = Game.player.selectedEmitter;
   if (selectedEmitter && emitter == selectedEmitter)
      cameraControl.SnapToFocusLocation(emitter.transform.position, true);
   else
      Game.player.SelectEmitter(emitter);
   SwitchControlSet(1);

}

function OnLaunch()
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      // Clear and readd one point unit, and launch.
      // Probably can just do this once at emitter Start().
      emitter.ClearQueue();
      AddUnitToQueue(0);
      emitter.Launch();
   }
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
      ua.color = emitter.color;
      if (!emitter.AddToQueue(ua))
         UIControl.OnScreenMessage("Queue is full.", Color.red, 1.5);
   }
}


function OnDashAbility()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);

   NewAbilityCursor(2);
}

function OnSlowAbility()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);

   NewAbilityCursor(4);
}

function OnPaintAbility()
{
   Game.player.ClearAllSelections();
   SwitchControlSet(0);

   NewAbilityCursor(1);
}

private function SetColor(color : Color)
{
   var emitter : Emitter = Game.player.selectedEmitter;
   if (emitter)
   {
      emitter.SetColor(color);
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

function OnDecreaseGameSpeed()
{
   Game.control.SpeedChange(Time.timeScale * 0.5);
}

function OnIncreaseGameSpeed()
{
   Game.control.SpeedChange(Time.timeScale * 2.0);
}

function OnResetGameSpeed()
{
   Game.control.SpeedChange(1.0);
}

function OnTooltipTrigger(data : TooltipTriggerData)
{
   // Hide
   if (!data.enterHover)
   {
      if (data.usePanelTooltip)
      {
         if (abilityCursor)
            UIControl.PanelTooltip(abilityCursor.tooltip+"\\n\\nCost: [00FF00]"+Game.costs.Ability(abilityCursor.ID));
         else
            UIControl.PanelTooltip("");
      }
      else
         UIControl.HoverTooltip("", data.offset);
   }
   else // Make visible
   {
      var tooltipString : String;
      tooltipString = data.text;
      var emitter : Emitter = Game.player.selectedEmitter;
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