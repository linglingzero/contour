(function () {
    // cheap trick to add decimals without hitting javascript issues
    // note that this fails for very large numbers
    var addFloat = function (a,b) { var factor = 10000, aa = a * factor, bb = b * factor; return (aa + bb) / factor; };
    var subFloat = function (a,b) { var factor = 10000, aa = a * factor, bb = b * factor; return (aa - bb) / factor; };
    var mulFloat = function (a,b) { var factor = 10000, aa = a * factor, bb = b * factor; return (aa * bb) / (factor*factor); };
    var divFloat = function (a,b) { return +((a / b).toFixed(4)); };

    var generalHelpers = {
        // the src is a function returns the function evaluated
        // otherwise returns src
        getValue: function (src, deafult, ctx, args) {
            args = Array.prototype.slice.call(arguments, 3);
            return !src ? deafult : typeof src === 'function' ? src.apply(ctx, args) : src;
        },

        seriesNameToClass: function (name) {
            return name || '';
        }
    };

    var logging = {
        warn: function (msg) {
            if (console && console.log)
                console.log(msg);
        }
    };

    var numberHelpers = {
        firstAndLast: function (ar) {
            return [ar[0], ar[ar.length-1]];
        },

        roundToNearest: function (number, multiple) {
            return Math.ceil(number / multiple) * multiple;
        },

        roundTo: function (value, digits) {
            return divFloat(Math.ceil(mulFloat(value, Math.pow(10, digits))), Math.pow(10, digits));
        },

        trunc: function (value) {
            return value - value % 1;
        },

        log10: function (value) {
            return Math.log(value) / Math.LN10;
        },

        clamp: function (val, l, h) {
            return val > h ? h : val < l ? l : val;
        },

        clampLeft: function (val, low) {
            return val < low ? low : val;
        },

        clampRight: function (val, high) {
            return val > high ? high : val;
        },

        degToRad: function (deg) {
            return deg * Math.PI / 180;
        },

        radToDeg: function (rad) {
            return rad * 180 / Math.PI;
        },

        linearRegression: function (dataSrc) {
            var lr = {};
            var n = dataSrc.length;
            var sum_x = 0;
            var sum_y = 0;
            var sum_xy = 0;
            var sum_xx = 0;
            var sum_yy = 0;

            for (var i = 0; i < n; i++) {
                sum_x += dataSrc[i].x;
                sum_y += dataSrc[i].y;
                sum_xy += (dataSrc[i].x*dataSrc[i].y);
                sum_xx += (dataSrc[i].x*dataSrc[i].x);
                sum_yy += (dataSrc[i].y*dataSrc[i].y);
            }

            lr.slope = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
            lr.intercept = (sum_y - lr.slope * sum_x)/n;
            lr.r2 = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);

            return lr;
        },

        niceRound: function (val) {
            // for now just round(10% above the value)
            return Math.ceil(val + val * 0.10);

            // var digits = Math.floor(Math.log(val) / Math.LN10) + 1;
            // var fac = Math.pow(10, digits);

            // if(val < 1) return _.nw.roundToNearest(val, 1);

            // if(val < fac / 2) return _.nw.roundToNearest(val, fac / 2);

            // return _.nw.roundToNearest(val, fac);
        }
    };

    var axisHelpers = {
        niceMinMax: function (min, max, ticks) {

            var excelRoundUp = function (value, up) { up = up != null ? up : 0; return divFloat(Math.ceil(value * Math.pow(10, up)), Math.pow(10, up)); };
            var excelMax = function (a, b) { return a >= b ? a : b; };
            // 2 ticks seem to wokr for min max and passing 5 ticks to d3
            ticks = ticks || 2;

            var nearestMul = function (val, mul) { return mulFloat(Math.ceil(val / mul), mul); };
            var digits = function (val) { return Math.floor(Math.log(val) / Math.LN10) + 1; };
            var fac = function (digits) { return Math.pow(10, digits); };


            var startAtZero = min === 0 ? 1 : max < 0 ? 1 : 0;

            if (min === max) {
                if (max === 0) {
                    a = -1.0;
                } else {
                    a = numberHelpers.log10(Math.abs(max));
                }
            } else {
                if(startAtZero) {
                    a = numberHelpers.log10(Math.abs(max)) - 0.5;
                } else {
                    a = numberHelpers.log10(max-min) - 0.5;
                }
            }

            var defaultRounding = -(a >= 0 ? numberHelpers.trunc(a) : Math.floor(a));

            // var defaultRounding = -numberHelpers.trunc((min === max ?
            //     max === 0 ? -1.0 : numberHelpers.log10(Math.abs(max)) :
            //     startAtZero ? numberHelpers.log10(Math.abs(max)) : numberHelpers.log10(max-min)
            // ) - 0.5);

            var negativeMinAmount = excelRoundUp(Math.max(0, -min) / ticks, defaultRounding);



            var intermediateMax = min === max ? max === 0 ? 1 : excelRoundUp(max + negativeMinAmount, defaultRounding)
                : excelRoundUp(max + negativeMinAmount,defaultRounding);

            var intermediateMin = startAtZero ?
                0 :
                (min === max ? 0 : excelRoundUp(min-negativeMinAmount,defaultRounding) * (defaultRounding === 0 ? Math.pow(10, defaultRounding) : 1)
                );
            // var diff = intermediateMax - intermediateMin;
            var interval = excelRoundUp((intermediateMax  - intermediateMin)/ticks, defaultRounding);
            var finalMin = subFloat(intermediateMin, negativeMinAmount);
            var finalMax = addFloat(finalMin, mulFloat(ticks, interval));
            var ticksValues = [finalMin];
            var prevTick = finalMin;

            for (var j=1; j < ticks; j++) {
                var newTick = addFloat(prevTick, interval);

                ticksValues.push(newTick);
                prevTick = newTick;
            }

            // total ticks are going to be either ticks or ticks + 1
            if (Math.abs(prevTick - finalMax) > 1e-10) {
                ticksValues.push(finalMax);
            }

            return {
                min: finalMin,
                max: finalMax,
                tickValues: ticksValues
            };

        },

        /*jshint eqnull:true */
        extractScaleDomain: function (domain, min, max) {
            var dataMin = min != null ? min : _.min(domain);
            var dataMax = max != null ? max : _.max(domain);
            var niceMinMax = axisHelpers.niceMinMax(dataMin, dataMax, 5);

            // we want null || undefined for all this comparasons
            // that == null gives us
            if (min == null && max == null) {
                return [niceMinMax.min, niceMinMax.max];
            }

            if (min == null) {
                return [Math.min(niceMinMax.min, max), max];
            }

            if (max == null) {
                return [min, Math.max(min, niceMinMax.max)];
            }

            return [min, max];
        },

        niceTicks: function (min, max, ticks) {
            var niceMinMax = axisHelpers.niceMinMax(min, max, (ticks||5));
            return niceMinMax.tickValues;
        }
    };


    var stringHelpers = {
        // measure text inside a Contour chart container
        textBounds: function (text, css) {
            var body = document.getElementsByTagName('body')[0];
            var wrapper = document.createElement('span');
            var dummy = document.createElement('span');
            wrapper.className = 'contour-chart';
            dummy.style.position = 'absolute';
            dummy.style.width = 'auto';
            dummy.style.height = 'auto';
            dummy.style.visibility = 'hidden';
            dummy.style.lineHeight = '100%';
            dummy.style.whiteSpace = 'nowrap';

            dummy.innerHTML = text;
            dummy.className = css.replace(/\./g, ' ');
            wrapper.appendChild(dummy);
            body.appendChild(wrapper);
            var res = { width: dummy.clientWidth, height: dummy.clientHeight };
            wrapper.removeChild(dummy);
            body.removeChild(wrapper);
            return res;
        }
    };

    var dateHelpers = {
        dateDiff: function(d1, d2) {
            var diff = d1.getTime() - d2.getTime();
            return diff / (24*60*60*1000);
        }
    };

    var arrayHelpers = {
        // concatenate and sort two arrays to the resulting array
        // is sorted ie. merge [2,4,6] and [1,3,5] = [1,2,3,4,5,6]
        merge: function (array1, array2) {
            if(typeof(array1) === 'number') array1 = [array1];
            if(typeof(array2) === 'number') array2 = [array2];
            if(!array1 || !array1.length) return array2;
            if(!array2 || !array2.length) return array1;

            return [].concat(array1, array2).sort(function (a,b) { return a-b; });
        },

        /*jshint eqnull:true */
        // we are using != null to get null & undefined but not 0
        normalizeSeries: function (data, categories) {
            var hasCategories = !!(categories && _.isArray(categories));
            function sortFn(a, b) { return a.x - b.x; }
            function normal(set, name) {
                var d = {
                    name: name,
                    data: _.map(set, function (d, i) {
                        var hasX = d != null && d.hasOwnProperty('x');
                        var val = function (v) { return v != null ? v : null; };
                        return hasX ? _.extend(d, { x: d.x, y: val(d.y) }) : { x: hasCategories ? categories[i] + '' : i, y: val(d) };
                    })
                };

                if (!hasCategories) {
                    d.data.sort(sortFn);
                }

                return d;
            }

            var correctDataFormat = _.isArray(data) && _.all(data, function (p) { return p.hasOwnProperty('x') && p.hasOwnProperty('y'); });
            var correctSeriesFormat = _.isArray(data) && _.isObject(data[0]) && data[0].hasOwnProperty('data') &&
                    data[0].hasOwnProperty('name') && _.all(data[0].data, function (p) { return p.hasOwnProperty('x') && p.hasOwnProperty('y'); });

            // do not make a new copy, if the data is already in the correct format!
            if (correctSeriesFormat) {
                return data;
            }

            // do the next best thing if the data is a set of points in the correct format
            if (correctDataFormat) {
                if (!hasCategories) data.sort(sortFn);
                return [{ name: 'series 1', data: data }];
            }

            // for the rest of the cases we need to normalize to the full format of the series
            if (_.isArray(data)) {
                if ((_.isObject(data[0]) && data[0].hasOwnProperty('data')) || _.isArray(data[0])) {
                    // this would be the shape for multiple series
                    return _.map(data, function (d, i) { return normal(d.data ? d.data : d, d.name ? d.name : 'series ' + (i+1)); });
                } else {
                    // this is just the shape [1,2,3,4] or [{x:0, y:1}, { x: 1, y:2}...]
                    return [normal(data, 'series 1')];
                }
            }

            // nothing to do to the data if it's not in a supported format
            return data;
        },

        // returns a function to format the data into a 'stacked' d3 layout
        // passing in a series data will add a y0 to each data point
        // where the point should start relative to the reset of the series points
        // at that x value
        stackLayout: function () {
            var stack = d3.layout
                .stack()
                .values(function (d) { return d.data; });
            // prepare satck to handle different x values with different lengths
            var outFn = function() {
                var y0s = {};
                return function (d, y0, y) {
                    d.y0 = y0s[d.x] != null ? y0s[d.x] : 0;
                    d.y = y;
                    y0s[d.x] = (y0s[d.x] || 0) + y;
                };
            };

            stack.out(outFn());

            return stack;
        },

        // return the uniq elements in the array
        // we are implementing our own version since this algorithm seems
        // to be a lot faster than what lodash uses
        uniq: function (array) {
            var cache = {}, result = [];
            var len = array.length;

            for (var j=0; j<len; j++) {
                var el = array[j], key = el + '';

                if (!cache.hasOwnProperty(key)) {
                    cache[key] = true;
                    result.push(el);
                }
            }

            return result;
        },

        maxTickValues: function (max, domain) {
            var len = domain.length;
            var values = [];

            if (max >= len) return domain.slice();

            // return d3.scale.linear().domain(domain).ticks(max);

            var tickInteval = Math.ceil((len) / (max));
            var cur = 0;
            while (cur < len) {
                values.push(domain[cur]);
                cur += tickInteval;
            }

            return values;
        },

        isSupportedDataFormat: function (data) {
            return _.isArray(data) && (_.isObject(data[0]) && data[0].hasOwnProperty('data')) || _.isArray(data[0]);
        }

    };

    var domHelpers = {
        selectDom: function (selector) {
            return d3.select(selector)[0][0];
        },

        getStyle: function (el, style) {
            if(!el) return undefined;
            var elem = typeof el === 'string' ? this.selectDom(el) : el;
            // we need a good way to check if the element is detached or not
            var styles = elem.offsetParent ? elem.ownerDocument.defaultView.getComputedStyle(elem, null) : elem.style;

            return style ? styles[style] : styles;
        },

        getCentroid: function (element) {
            var parentBox = element.offsetParent.getBoundingClientRect();
            var bbox = element.getBoundingClientRect();

            return [bbox.left - parentBox.left + bbox.width/2, bbox.top - parentBox.top + bbox.height/2];
        }
    };

    var debuggingHelpers = {
        warning: function (msg) {
            if(console && console.log) {
                console.log('WARNING: ' + msg);
            }
        }
    };

    _.nw = _.extend({}, _.nw, numberHelpers, arrayHelpers, stringHelpers, dateHelpers,
        axisHelpers, debuggingHelpers, domHelpers, generalHelpers, logging);

})();
