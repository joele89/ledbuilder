import panelLibrary from "./panelLibrary.js";
import processorLibrary from "./processorLibrary.js";

var project;
var loading = true;

//#region "Screen Settings"
function screen_change() {
    if (document.getElementById("data_group_width").value < 1) { document.getElementById("data_group_width").value = 1 }
    if (document.getElementById("data_group_height").value < 1) { document.getElementById("data_group_height").value = 1 }
    if (document.getElementById("power_group_width").value < 1) { document.getElementById("power_group_width").value = 1 }
    if (document.getElementById("power_group_height").value < 1) { document.getElementById("power_group_height").value = 1 }

    document.getElementById("data_panel_max").innerHTML = Math.floor(document.getElementById("pixel_capacity").value / (document.getElementById("panel_width").value * document.getElementById("panel_height").value));
    if (document.getElementById("data_panel_capacity").value > document.getElementById("data_panel_max").innerHTML * 1) {
        document.getElementById("data_panel_capacity").value = document.getElementById("data_panel_max").innerHTML
    }
    if (document.getElementById("panel_select").value != "custom") {
        let capacity_watts = document.getElementById("power_capacity").selectedOptions[0].getAttribute("watts")
        let panel_watts = panelLibrary[document.getElementById("panel_select").value].power_draw
        document.getElementById("power_panel_max").innerHTML = Math.floor(capacity_watts / panel_watts);
        if (document.getElementById("power_panel_capacity").value > document.getElementById("power_panel_max").innerHTML * 1) {
            document.getElementById("power_panel_capacity").value = document.getElementById("power_panel_max").innerHTML
        }
    }
    document.getElementById("output_canvas").innerHTML = "<img src=\"" + generate_map() + "\">"
    project_change()
}

function processor_change() {
    document.getElementById("processor_framerate").options.length = 0
    document.getElementById("processor_bitdepth").options.length = 0

    if (document.getElementById("processor_select").value == "custom") {
        document.getElementById("processor_options").style.display = "none";
        document.getElementById("pixel_capacity").value = 650000;
    } else {
        document.getElementById("processor_options").style.display = "unset";
        
        processorLibrary[document.getElementById("processor_select").value].framerate_options.forEach(f => {
            document.getElementById("processor_framerate").add(new Option(f,f));
        })
        processorLibrary[document.getElementById("processor_select").value].bit_options.forEach((b,k) => {
            let o = new Option(b,b);
            o.setAttribute("weight", processorLibrary[document.getElementById("processor_select").value].bit_weight[k])
            document.getElementById("processor_bitdepth").add(o);
        })
        port_change()
    }
    screen_change()
}

function panel_change() {
    if (document.getElementById("panel_select").value == "custom") {
        document.getElementById("panel_width").value = 128
        document.getElementById("panel_height").value = 128
    } else {
        document.getElementById("panel_width").value = panelLibrary[document.getElementById("panel_select").value].pixels_W
        document.getElementById("panel_height").value = panelLibrary[document.getElementById("panel_select").value].pixels_H
    }
    port_change()
}

function port_change() {
    if (document.getElementById("processor_select").value != "custom") {
        var processor = processorLibrary[document.getElementById("processor_select").value]
        let pixel_capacity = (processor.port_capacity * (1000 ** 3) * processor.efficiency / 100) / (document.getElementById("processor_bitdepth").selectedOptions[0].getAttribute("weight") * 3) / document.getElementById("processor_framerate").value
        document.getElementById("pixel_capacity").value = pixel_capacity;
    }
    screen_change()
}

function group_change() {
    if (document.getElementById("data_group").checked) {
        document.getElementById("data_group_config").style.display = "unset"
    } else {
        document.getElementById("data_group_config").style.display = "none"
    }
    if (document.getElementById("power_group").checked) {
        document.getElementById("power_group_config").style.display = "unset"
    } else {
        document.getElementById("power_group_config").style.display = "none"
    }
    screen_change()
}

function color_method() {
    var panel_colors = document.getElementById("panel_colors");
    var method = document.getElementById("color_method").value

    panel_colors.innerHTML = '<input type="color" value="#FFC852">'
    if (method == "checkerboard") {
        panel_colors.innerHTML += '<input type="color" value="#00C8A0">'
    }

    Object.entries(panel_colors.children).forEach(colorcell => {
        colorcell[1].addEventListener("input", screen_change)
    });
    screen_change();
}
//#endregion

//#region "Graphic Drawing"
function generate_map() {
    var map_width = document.getElementById("map_width").value * 1
    var map_height = document.getElementById("map_height").value * 1
    var panel_width = document.getElementById("panel_width").value * 1
    var panel_height = document.getElementById("panel_height").value * 1
    var panel_colors = document.getElementById("panel_colors").children
    var map_border = document.getElementById("map_border").value
    var power_enable = document.getElementById("wiring_power_enable").checked
    var data_enable = document.getElementById("wiring_data_enable").checked

    if (panel_width < 64 || panel_height < 64) {
        throw new Error("Out of range");
    }

    var screenmap = document.createElement("canvas");
    screenmap.width = map_width * panel_width;
    screenmap.height = map_height * panel_height;
    var screencontext = screenmap.getContext("2d");
    for (let w = 0; w < map_width; w++) {
        for (let h = 0; h < map_height; h++) {
            let colorIndex = (w + h) % panel_colors.length;
            rect(screencontext, w * panel_width, h * panel_height, panel_width, panel_height, panel_colors[colorIndex].value, map_border)
        }
    }

    let power_offset = 0;
    let data_offset = 0;

    if (power_enable && data_enable) {
        power_offset = -0.2
        data_offset = +0.2
    } 

    if (data_enable) {
        let path_type = document.querySelector('input[name="data_path"]:checked')?.value;
        let path_start = document.querySelector('input[name="data_start"]:checked')?.value;
        let rectangular_data = document.getElementById("data_group").checked;
        let group_w = document.getElementById("data_group_width").value * 1
        let group_h = document.getElementById("data_group_height").value * 1
        let panel_limit = document.getElementById("data_panel_capacity").value
        let path_color = document.getElementById("data_color").value

        draw_path(screencontext,path_type,path_start,map_width,map_height,rectangular_data,group_w,group_h,panel_width,panel_height,panel_limit,path_color,data_offset,true)
    }

    if (power_enable) {
        let path_type = document.querySelector('input[name="power_path"]:checked')?.value;
        let path_start = document.querySelector('input[name="power_start"]:checked')?.value;
        let rectangular_data = document.getElementById("power_group").checked;
        let group_w = document.getElementById("power_group_width").value * 1
        let group_h = document.getElementById("power_group_height").value * 1
        let panel_limit = document.getElementById("power_panel_capacity").value
        let path_color = document.getElementById("power_color").value

        draw_path(screencontext,path_type,path_start,map_width,map_height,rectangular_data,group_w,group_h,panel_width,panel_height,panel_limit,path_color,power_offset,false)
    }
    return screenmap.toDataURL('image/png');
}

function draw_path(ctx,path_type,path_start,map_width,map_height,rectangular_groups,group_width,group_height,panel_width,panel_height,panel_limit,path_color,lane_offset,redundant) {
    let path = [];

    if (rectangular_groups) {
        path = splitToGroups(path_type, map_width, map_height, group_width, group_height, path_start, panel_limit)
    } else {
        path = calculate_path(path_type, map_width, map_height, path_start)
        path = splitPathByLength(path, panel_limit)
    }

    let lane_px = lane_offset * Math.min(panel_width, panel_height);
    let centre_x = panel_width / 2;
    let centre_y = panel_height / 2;

    for(let g = 0; g < path.length; g++) {

        for(var p = 0; p < path[g].length - 1; p++) {
            let current_cell = path[g][p];
            let next_cell = path[g][p+1];

            let direction_x = Math.sign(next_cell.x - current_cell.x);
            let direction_y = Math.sign(next_cell.y - current_cell.y);

            let perp_x = -direction_y;
            let perp_y = direction_x;

            if (perp_x < 0 || (perp_x === 0 && perp_y < 0)) {
                perp_x *= -1;
                perp_y *= -1;
            }

            let laneOffsetX = perp_x * lane_px;
            let laneOffsetY = perp_y * lane_px;

            let origin_x = centre_x + (direction_x * panel_width / 4) + laneOffsetX + (current_cell.x * panel_width);
            let origin_y = centre_y + (direction_y * panel_height / 4) + laneOffsetY + (current_cell.y * panel_height);

            let destination_x = centre_x + (-direction_x * panel_width / 4) + laneOffsetX + (next_cell.x * panel_width);
            let destination_y = centre_y + (-direction_y * panel_height / 4) + laneOffsetY + (next_cell.y * panel_height);

            arrow(ctx, origin_x, origin_y, destination_x, destination_y, path_color);

        }

        let first_cell = path[g][0];
        let first_port_id = {x: first_cell.x * panel_width + panel_width / 2 + lane_px, y: first_cell.y * panel_height + panel_height / 2 + lane_px }   
        port_start(ctx, first_port_id.x, first_port_id.y, g + 1, path_color)

        let last_cell = path[g][p];
        if (redundant && last_cell !== first_cell) {
            let last_port_id = {x: last_cell.x * panel_width + panel_width / 2 + lane_px, y: last_cell.y * panel_height + panel_height / 2 + lane_px}
            port_end(ctx, last_port_id.x, last_port_id.y, g + 1, path_color)
        }
    }
}

function calculate_path(type, width, height, startCorner) {
    width = Math.ceil(width);
    height = Math.ceil(height);
    const path = [];
    switch (type) {
        case "C":
            for (let y = 0; y < height; y++) {
                if (y % 2 === 0) {
                    for (let x = 0; x < width; x++) path.push({ x, y })
                } else {
                    for (let x = width - 1; x >= 0; x--) path.push({ x, y })
                }
            }
            break;
        case "U":
            for (let x = 0; x < width; x++) {
                if (x % 2 === 0) {
                    for (let y = 0; y < height; y++) path.push({ x, y })
                } else {
                    for (let y = height - 1; y >= 0; y--) path.push({ x, y })
                }
            }
            break;
        case "N":
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    path.push({ x, y })
                }
            }
            break;
        case "Z":
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    path.push({ x, y })
                }
            }
            break;
    }

    return path.map(p => {
        let x = p.x
        let y = p.y

        switch (startCorner) {
            case "TL":
                return { x, y }

            case "TR":
                return { x: width - 1 - x, y }

            case "BL":
                return { x, y: height - 1 - y }

            case "BR":
                return {
                x: width - 1 - x,
                y: height - 1 - y
                }
        }
    })

}

function splitToGroups(path_type, map_w, map_h, group_w, group_h, path_start, path_limit) {
    const regions = []
    const paths = []

    for (let region_y = 0; region_y < map_h; region_y += group_h) {
        for (let region_x = 0; region_x < map_w; region_x += group_w) {
            let region_path = calculate_path(path_type, Math.min(group_w, map_w - region_x), Math.min(group_h, map_h - region_y), path_start)
            const shifted = region_path.map(p => ({
                x: p.x + (region_x * 1),
                y: p.y + (region_y * 1)
            }))
            let split_paths = splitPathByLength(shifted, path_limit)
            split_paths.forEach(p => { paths.push(p)});
        }
    }

    return paths;
}

function splitPathByLength(path, max_length) {
    const paths = []
    let current = []

    for (let i = 0; i < path.length; i++) {
        current.push(path[i])

        if (current.length >= max_length) {
            paths.push(current)
            current = []
        }
    }

    if (current.length > 0) {
        paths.push(current)
    }

    return paths
}

function port_start(ctx, left, top, port_text, border) {
    circle(ctx, left, top, 25, "white", border);
    
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "24px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(port_text, left, top);
}

function port_end(ctx, left, top, port_text, border) {
    regular_poly(ctx, left, top, 25, 6, "white", border);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "24px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(port_text, left, top);
}

function regular_poly(ctx, left, top, radius, sides, fill, border) {
    const step = (Math.PI * 2) / sides;
    
    ctx.beginPath()
    for (let s=0; s <= sides; s++) {
        const curAngle = s * step;
        const vx = left + radius * Math.cos(curAngle);
        const vy = top + radius * Math.sin(curAngle);
        if (s == 0) {
            ctx.moveTo(vx, vy);
        } else {
            ctx.lineTo(vx, vy);
        }
    }
    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.fillStyle = fill
    ctx.strokeStyle = border
    ctx.fill()
    ctx.stroke()
}

function circle(ctx, left, top, radius, fill, border) {
    ctx.beginPath();
    ctx.arc(left, top, radius, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.lineWidth = 1;
    ctx.fillStyle = fill
    ctx.strokeStyle = border
    ctx.fill()
    ctx.stroke()
}

function rect(ctx, left, top, width, height, style, border) {
    ctx.fillStyle = style;
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = border;
    ctx.strokeRect(left, top, width, height);
}

function crosshair(ctx,x,y) {

    ctx.beginPath();

    ctx.moveTo(x, y - 32);
    ctx.lineTo(x, y + 32);
    ctx.moveTo(x - 32, y);
    ctx.lineTo(x + 32, y);
    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black"
    ctx.stroke();
}

function arrow(ctx, x1, y1, x2, y2, style) {
    var lineWidth = 3;

    let mainAngle = Math.atan2(y2-y1,x2-x1)
    let c = {x: x2 - (2 * lineWidth * Math.cos(mainAngle)), y: y2 - (2 * lineWidth * Math.sin(mainAngle)) };
    let b = {x: x2 - (3 * lineWidth * Math.cos(mainAngle)), y: y2 - (3 * lineWidth * Math.sin(mainAngle)) };
    let point1 = {x: lineWidth * Math.cos(mainAngle) + c.x, y: lineWidth * Math.sin(mainAngle) + c.y};
    let point2 = {x: lineWidth * Math.cos(mainAngle + 2/3 * Math.PI) + c.x, y: lineWidth * Math.sin(mainAngle + 2/3 * Math.PI) + c.y};
    let point3 = {x: lineWidth * Math.cos(mainAngle + 4/3 * Math.PI) + c.x, y: lineWidth * Math.sin(mainAngle + 4/3 * Math.PI) + c.y};

    ctx.beginPath();
    ctx.moveTo(point1.x,point1.y);
    ctx.lineTo(point2.x,point2.y);
    ctx.lineTo(point3.x,point3.y);
    ctx.closePath();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.strokeStyle = style
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(b.x,b.y);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = style;
    ctx.closePath();
    ctx.stroke();
}

//#endregion

//#region "Storage"
async function load_project(project_id) {
    loading = true;
    if (project_id == null) {
        project_id = localStorage.getItem("A")
        if (!project_id) {
            project_id = crypto.randomUUID()
            localStorage.setItem("A", project_id)
        }
    }
    project = JSON.parse(localStorage.getItem(project_id))
    if (project == null) {
        project = {name: "", screens: []}
    } else {
        project.screens.forEach(v => {
            add_screen(v.name);
        })
        let decompress_screen = await decompress(project.screens[0].config)
        screen_from_json(decompress_screen)
    }
    loading = false;
}

async function store_project() {
    let active_screen = document.querySelector("project_screen[class=screen_active]")
    let active_index = Array.from(document.getElementById("project_screens").children).indexOf(active_screen)

    let compress_screen = await compress(generate_screen_json())

    project.screens[active_index] = {name: active_screen.querySelector("input").value, config: compress_screen}

    let project_id = localStorage.getItem("A")

    localStorage.setItem(project_id,JSON.stringify(project))
}

async function compress(data) {
    const stream = new Blob([data]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    let blob = await (new Response(compressedStream)).blob()
    let bytes = new Uint8Array(await blob.arrayBuffer())
    return bytes.toBase64()
}

async function decompress(b64) {
    let bytes = Uint8Array.fromBase64(b64)
    let blob = new Blob([bytes]);
    const decompressionStream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return (await (new Response(decompressionStream)).text());
}

function screen_from_json(json) {
    let screen_map = JSON.parse(json);
    document.getElementById("panel_select").value = screen_map.panel.s
    document.getElementById("panel_width").value = screen_map.panel.w
    document.getElementById("panel_height").value = screen_map.panel.h
    document.getElementById("map_width").value = screen_map.map.w
    document.getElementById("map_height").value = screen_map.map.h
    document.getElementById("color_method").value = screen_map.style.method
    document.getElementById("map_border").value = screen_map.style.border
    document.getElementById("power_color").value = screen_map.style.power_col
    document.getElementById("data_color").value = screen_map.style.data_col
    document.getElementById("wiring_data_enable").checked = screen_map.data.en
    document.getElementById("processor_select").value = screen_map.data.proc
    processor_change()
    document.getElementById("processor_framerate").value = screen_map.data.fr
    document.getElementById("processor_bitdepth").value = screen_map.data.bit
    document.getElementById("pixel_capacity").value = screen_map.data.pix_cap
    document.getElementById("data_panel_capacity").value = screen_map.data.pnl_cap
    document.querySelector('input[name="data_path"][value="' + screen_map.data.path + '"]').checked = true
    document.querySelector('input[name="data_start"][value="' + screen_map.data.start + '"]').checked = true
    document.getElementById("data_group").checked = screen_map.data.group.en
    document.getElementById("data_group_width").value = screen_map.data.group.w
    document.getElementById("data_group_height").value = screen_map.data.group.h
    document.getElementById("wiring_power_enable").checked = screen_map.power.en
    document.getElementById("power_capacity").value = screen_map.power.cap
    document.getElementById("power_panel_capacity").value = screen_map.power.pnl_cap
    document.querySelector('input[name="power_path"][value="' + screen_map.power.path + '"]').checked = true
    document.querySelector('input[name="power_start"][value="' + screen_map.power.start + '"]').checked = true
    document.getElementById("power_group").checked = screen_map.power.group.en
    document.getElementById("power_group_width").value = screen_map.power.group.w
    document.getElementById("power_group_height").value = screen_map.power.group.h
}

function generate_screen_json() {

    var screen_map = {
        panel: {
            s: document.getElementById("panel_select").value,
            w: document.getElementById("panel_width").value,
            h: document.getElementById("panel_height").value,
        },
        map: {
            w: document.getElementById("map_width").value,
            h: document.getElementById("map_height").value,
        },
        style: {
            method: document.getElementById("color_method").value,
            border: document.getElementById("map_border").value,
            power_col: document.getElementById("power_color").value,
            data_col: document.getElementById("data_color").value,
        },
        data: {
            en: document.getElementById("wiring_data_enable").checked,
            proc: document.getElementById("processor_select").value,
            fr: document.getElementById("processor_framerate").value,
            bit: document.getElementById("processor_bitdepth").value,
            pix_cap: document.getElementById("pixel_capacity").value,
            pnl_cap: document.getElementById("data_panel_capacity").value,

            path: document.querySelector('input[name="data_path"]:checked')?.value,
            start: document.querySelector('input[name="data_start"]:checked')?.value,

            group: {
                en: document.getElementById("data_group").checked,
                w: document.getElementById("data_group_width").value,
                h: document.getElementById("data_group_height").value
            }
        },
        power: {
            en: document.getElementById("wiring_power_enable").checked,
            cap: document.getElementById("power_capacity").value,
            pnl_cap: document.getElementById("power_panel_capacity").value,

            path: document.querySelector('input[name="power_path"]:checked')?.value,
            start: document.querySelector('input[name="power_start"]:checked')?.value,

            group: {
                en: document.getElementById("power_group").checked,
                w: document.getElementById("power_group_width").value,
                h: document.getElementById("power_group_height").value
            }
        } 
    }

    return JSON.stringify(screen_map);
}

//#endregion

//#region "Project Settings"

function project_change() {
    if (!loading) {
        store_project();
    }
}

function add_screen(name) {
    let project_screens = document.getElementById("project_screens")
    let new_index = project_screens.children.length
    let screen_controls = document.createElement("project_screen")
    if (new_index == 0) {
        screen_controls.classList += "screen_active"
    } else {
        screen_controls.classList += "screen_inactive"
    }
    project_screens.appendChild(screen_controls)
    let ctrl_show = document.createElement("a")
    ctrl_show.title = "Current Screen"
    ctrl_show.classList += "screen_show"
    ctrl_show.innerHTML = '<i class="fas fa-eye"></i>'
    screen_controls.appendChild(ctrl_show)
    let ctrl_hide = document.createElement("a")
    ctrl_hide.title = "Show"
    ctrl_hide.classList += "screen_hide"
    ctrl_hide.addEventListener("click", activate_screen)
    ctrl_hide.innerHTML = '<i class="fas fa-eye-slash"></i>'
    screen_controls.appendChild(ctrl_hide)
    let ctrl_name = document.createElement("input")
    ctrl_name.name = "screen_name"
    ctrl_name.type = "text"
    ctrl_name.addEventListener("input",project_change)
    if (!name) {
        ctrl_name.value = "Screen " + (new_index + 1)
    } else {
        ctrl_name.value = name
    }
    screen_controls.appendChild(ctrl_name)
    let ctrl_duplicate = document.createElement("a")
    ctrl_duplicate.title = "Duplicate"
    ctrl_duplicate.addEventListener("click", duplicate_screen)
    ctrl_duplicate.innerHTML = '<i class="fas fa-copy"></i>'
    screen_controls.appendChild(ctrl_duplicate)
    let ctrl_delete = document.createElement("a")
    ctrl_delete.title = "Delete"
    ctrl_delete.addEventListener("click", delete_screen)
    ctrl_delete.innerHTML = '<i class="fas fa-trash"></i>'
    screen_controls.appendChild(ctrl_delete)
    
    project_change();
}

async function activate_screen(event) {
    loading = true
    let target = event.target
    if (event.target.tagName == 'I') {
        target = event.target.parentNode
    } else if (event.target.tagName == 'A') {
        target = event.target
    } else {
        return;
    }
    window.tgx = target
    screen_change()
    let active_screen = document.querySelector("project_screen[class=screen_active]")
    let target_index = Array.from(document.getElementById("project_screens").children).indexOf(target.parentNode)
    let decompress_screen = await decompress(project.screens[target_index].config)
    screen_from_json(decompress_screen)
    active_screen.classList.toggle("screen_active")
    active_screen.classList.toggle("screen_inactive")
    target.parentNode.classList.toggle("screen_active")
    target.parentNode.classList.toggle("screen_inactive")
    loading = false
}

function duplicate_screen(event) {
    let target = event.target
    if (event.target.tagName == 'I') {
        target = event.target.parentNode
    } else if (event.target.tagName == 'A') {
        target = event.target
    } else {
        return;
    }

    let target_index = Array.from(document.getElementById("project_screens").children).indexOf(target.parentNode)
    let new_index = document.getElementById("project_screens").children.length
    add_screen()
    project.screens[new_index] = project.screens[target_index]
    project_change();
}

function delete_screen(event) {
    let target = event.target
    if (event.target.tagName == 'I') {
        target = event.target.parentNode
    } else if (event.target.tagName == 'A') {
        target = event.target
    } else {
        return;
    }
    let target_screen = target.parentNode;
    if (target_screen.classList.contains("screen_active")) {
        return;
    }
    let target_index = Array.from(document.getElementById("project_screens").children).indexOf(target_screen);
    project.screens.splice(target_index,1);
    target_screen.remove();
    project_change();
}

function add_screen_click() {
    let active_screen = document.querySelector("project_screen[class=screen_active]")
    let active_index = Array.from(document.getElementById("project_screens").children).indexOf(active_screen)
    screen_change()
    project.screens[document.getElementById("project_screens").children.length] = project.screens[active_index]
    add_screen()
}
//#endregion


async function init() {
    
    document.getElementById("project_name").value = Date.now();

    let panel_select = document.getElementById("panel_select")
    Object.entries(panelLibrary).forEach(p => {
        panel_select.add(new Option (p[0],p[0]))
    })
    let processor_select = document.getElementById("processor_select")
    Object.entries(processorLibrary).forEach(p => {
        processor_select.add(new Option(p[0],p[0]))
    })

    await load_project()

    //
    //Attach Handlers
    document.getElementById("panel_select").addEventListener("input", panel_change)
    document.getElementById("panel_width").addEventListener("input", screen_change)
    document.getElementById("panel_height").addEventListener("input", screen_change)
    document.getElementById("map_width").addEventListener("input", screen_change)
    document.getElementById("map_height").addEventListener("input", screen_change)
    document.getElementById("map_border").addEventListener("input", screen_change)
    document.getElementById("power_color").addEventListener("input", screen_change)
    document.getElementById("data_color").addEventListener("input", screen_change)

    document.getElementById("wiring_data_enable").addEventListener("input", screen_change)    
    document.getElementById("processor_select").addEventListener("input", processor_change)
    document.getElementById("processor_framerate").addEventListener("input", port_change)
    document.getElementById("processor_bitdepth").addEventListener("input", port_change)
    document.getElementById("pixel_capacity").addEventListener("input", screen_change)
    document.getElementById("data_panel_capacity").addEventListener("input", screen_change)

    document.getElementById("data_path_U").addEventListener("input", screen_change)
    document.getElementById("data_path_C").addEventListener("input", screen_change)
    document.getElementById("data_path_N").addEventListener("input", screen_change)
    document.getElementById("data_path_Z").addEventListener("input", screen_change)
    document.getElementById("data_start_tl").addEventListener("input", screen_change)
    document.getElementById("data_start_tr").addEventListener("input", screen_change)
    document.getElementById("data_start_bl").addEventListener("input", screen_change)
    document.getElementById("data_start_br").addEventListener("input", screen_change)

    document.getElementById("data_group").addEventListener("input", group_change)
    document.getElementById("data_group_width").addEventListener("input", screen_change)
    document.getElementById("data_group_height").addEventListener("input", screen_change)

    document.getElementById("wiring_power_enable").addEventListener("input", screen_change)
    document.getElementById("power_capacity").addEventListener("input", screen_change)
    document.getElementById("power_panel_capacity").addEventListener("input", screen_change)
    document.getElementById("power_path_U").addEventListener("input", screen_change)
    document.getElementById("power_path_C").addEventListener("input", screen_change)
    document.getElementById("power_path_N").addEventListener("input", screen_change)
    document.getElementById("power_path_Z").addEventListener("input", screen_change)
    document.getElementById("power_start_tl").addEventListener("input", screen_change)
    document.getElementById("power_start_tr").addEventListener("input", screen_change)
    document.getElementById("power_start_bl").addEventListener("input", screen_change)
    document.getElementById("power_start_br").addEventListener("input", screen_change)

    document.getElementById("power_group").addEventListener("input", group_change)
    document.getElementById("power_group_width").addEventListener("input", screen_change)
    document.getElementById("power_group_height").addEventListener("input", screen_change)


    document.getElementById("color_method").addEventListener("input", color_method)

    document.getElementById("add_screen").addEventListener("click", add_screen_click)

    if (document.getElementById("project_screens").children.length == 0)
    {
        add_screen();
    }

    color_method();
    group_change();
    panel_change();

}


document.addEventListener("DOMContentLoaded", init)